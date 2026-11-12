import { beforeAll, describe, expect, test } from "bun:test";

import { request } from "../helpers/app";
import { login, signAccessToken } from "../helpers/auth";
import { resetDatabase, SEED_PASSWORD } from "../helpers/database";

type Paginated<T> = {
	data: T[];
	meta: { page: number; limit: number; totalCount: number };
};
type RoleOption = { id: string; name: string };
type PermissionOption = { group: string; permissions: { name: string }[] };

let superuserToken: string;
let adminToken: string;

beforeAll(async () => {
	await resetDatabase();
	superuserToken = (await login("superuser@example.com")).accessToken;
	adminToken = (await login("admin@example.com")).accessToken;
});

describe("GET /settings/users", () => {
	test("returns a paginated list", async () => {
		const response = await request<Paginated<{ email: string }>>(
			"GET",
			"/settings/users?page=1&perPage=1&sort=email&sortDirection=asc",
			{ token: adminToken },
		);
		expect(response.status).toBe(200);
		expect(response.body.data?.meta).toEqual({
			page: 1,
			limit: 1,
			totalCount: 2,
		});
		expect(response.body.data?.data.map((user) => user.email)).toEqual([
			"admin@example.com",
		]);
	});

	test("applies a filter read off the raw URL", async () => {
		const response = await request<Paginated<{ email: string }>>(
			"GET",
			"/settings/users?filter[email]=superuser&filter[status]=active",
			{ token: adminToken },
		);
		expect(response.status).toBe(200);
		expect(response.body.data?.data.map((user) => user.email)).toEqual([
			"superuser@example.com",
		]);
	});

	test("answers 400 for an unknown filter key", async () => {
		const response = await request(
			"GET",
			"/settings/users?filter[password]=x",
			{ token: adminToken },
		);
		expect(response.status).toBe(400);
		expect(response.body.errors?.[0]?.field).toBe("filter[password]");
	});

	test("answers 422 for a sort field outside the allow-list", async () => {
		const response = await request("GET", "/settings/users?sort=password", {
			token: adminToken,
		});
		expect(response.status).toBe(422);
	});
});

describe("RBAC", () => {
	test("a user without roles gets 403 on a guarded route", async () => {
		const created = await request("POST", "/settings/users", {
			token: superuserToken,
			body: {
				name: "Plain",
				email: "plain@example.com",
				password: SEED_PASSWORD,
				status: "active",
				remark: null,
				roleIds: [],
			},
		});
		expect(created.status).toBe(201);

		const list = await request<Paginated<{ id: string }>>(
			"GET",
			"/settings/users?filter[email]=plain@example.com",
			{ token: superuserToken },
		);
		const plainId = list.body.data?.data[0]?.id ?? "";
		expect(plainId).not.toBe("");

		/* Users created through the API are unverified and cannot log in. */
		const plainToken = signAccessToken(plainId);

		const forbidden = await request("GET", "/settings/users", {
			token: plainToken,
		});
		expect(forbidden.status).toBe(403);
		expect(forbidden.body.success).toBe(false);

		const profile = await request<{ roles: string[] }>("GET", "/profile", {
			token: plainToken,
		});
		expect(profile.status).toBe(200);
		expect(profile.body.data?.roles).toEqual([]);
	});

	test("select-options are superuser only", async () => {
		const admin = await request("GET", "/settings/select-options/roles", {
			token: adminToken,
		});
		expect(admin.status).toBe(403);

		const superuser = await request<RoleOption[]>(
			"GET",
			"/settings/select-options/roles",
			{ token: superuserToken },
		);
		expect(superuser.status).toBe(200);
		expect(superuser.body.data?.map((role) => role.name)).toEqual(["admin"]);

		const permissions = await request<PermissionOption[]>(
			"GET",
			"/settings/select-options/permissions",
			{ token: superuserToken },
		);
		expect(permissions.status).toBe(200);
		expect(
			permissions.body.data?.flatMap((group) => group.permissions).length,
		).toBe(15);
	});
});

describe("Select-options cache", () => {
	test("a new role shows up in the cached role options", async () => {
		await request("GET", "/settings/select-options/roles", {
			token: superuserToken,
		});

		const created = await request("POST", "/settings/roles", {
			token: superuserToken,
			body: { name: "editor", permissionIds: [] },
		});
		expect(created.status).toBe(201);

		const options = await request<RoleOption[]>(
			"GET",
			"/settings/select-options/roles",
			{ token: superuserToken },
		);
		expect(options.body.data?.map((role) => role.name)).toEqual([
			"admin",
			"editor",
		]);
	});

	test("a new permission shows up in the cached permission options", async () => {
		await request("GET", "/settings/select-options/permissions", {
			token: superuserToken,
		});

		const created = await request("POST", "/settings/permissions", {
			token: superuserToken,
			body: { group: "report", name: ["list"] },
		});
		expect(created.status).toBe(201);

		const options = await request<PermissionOption[]>(
			"GET",
			"/settings/select-options/permissions",
			{ token: superuserToken },
		);
		expect(
			options.body.data
				?.flatMap((group) => group.permissions)
				.map((permission) => permission.name),
		).toContain("report list");
	});

	test("a duplicate role name is 422", async () => {
		const response = await request("POST", "/settings/roles", {
			token: superuserToken,
			body: { name: "editor", permissionIds: [] },
		});
		expect(response.status).toBe(422);
	});
});
