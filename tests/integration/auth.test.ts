import { beforeAll, describe, expect, test } from "bun:test";

import { queuedMails, request } from "../helpers/app";
import { login } from "../helpers/auth";
import { resetDatabase, SEED_PASSWORD } from "../helpers/database";

type TokenPair = { accessToken: string; refreshToken: string };
type LoginData = TokenPair & { user: { email: string; roles: string[] } };

beforeAll(resetDatabase);

describe("POST /auth/login", () => {
	test("returns the user and a token pair for a seeded user", async () => {
		const response = await request<LoginData>("POST", "/auth/login", {
			body: { email: "admin@example.com", password: SEED_PASSWORD },
		});
		expect(response.status).toBe(200);
		expect(response.body.success).toBe(true);
		expect(response.body.data?.user.email).toBe("admin@example.com");
		expect(response.body.data?.user.roles).toEqual(["admin"]);
		expect(response.body.data?.accessToken).toBeString();
		expect(response.body.data?.refreshToken).toBeString();
	});

	test("answers a wrong password and an unknown email identically", async () => {
		const wrong = await request("POST", "/auth/login", {
			body: { email: "admin@example.com", password: "Wr0ngPassword!" },
		});
		const unknown = await request("POST", "/auth/login", {
			body: { email: "nobody@example.com", password: "Wr0ngPassword!" },
		});
		expect(wrong.status).toBe(400);
		expect(unknown.status).toBe(400);
		expect(wrong.body.errors?.[0]?.field).toBe("email");
		expect(unknown.body).toEqual(wrong.body);
	});

	test("answers 422 for a malformed body", async () => {
		const response = await request("POST", "/auth/login", {
			body: { email: "not-an-email" },
		});
		expect(response.status).toBe(422);
		expect(response.body.errors?.length).toBeGreaterThan(0);
	});
});

describe("POST /auth/refresh", () => {
	test("rotates the refresh token and rejects the old one", async () => {
		const { refreshToken } = await login("admin@example.com");

		const first = await request<TokenPair>("POST", "/auth/refresh", {
			body: { refreshToken },
		});
		expect(first.status).toBe(200);
		expect(first.body.data?.refreshToken).toBeString();

		const reused = await request("POST", "/auth/refresh", {
			body: { refreshToken },
		});
		expect(reused.status).toBe(401);
	});

	test("rejects an access token", async () => {
		const { accessToken } = await login("admin@example.com");
		const response = await request("POST", "/auth/refresh", {
			body: { refreshToken: accessToken },
		});
		expect(response.status).toBe(401);
	});

	test("a refresh token is not a bearer token", async () => {
		const { refreshToken } = await login("admin@example.com");
		const response = await request("GET", "/profile", {
			token: refreshToken,
		});
		expect(response.status).toBe(401);
	});
});

describe("POST /auth/register", () => {
	test("creates the user and queues a verification mail", async () => {
		const before = queuedMails.length;
		const response = await request("POST", "/auth/register", {
			body: {
				name: "Jane",
				email: "jane@example.com",
				password: SEED_PASSWORD,
			},
		});
		expect(response.status).toBe(201);
		expect(response.body.data).toBeNull();
		expect(queuedMails.length).toBe(before + 1);
		const mail = queuedMails[queuedMails.length - 1];
		expect(mail?.to).toBe("jane@example.com");
		expect(mail?.template).toBe("/auth/email-verification");
		expect(mail?.variables?.verification_url).toContain(
			"/auth/verify-email?token=",
		);
	});

	test("answers 422 for a live duplicate email", async () => {
		const response = await request("POST", "/auth/register", {
			body: {
				name: "Admin",
				email: "admin@example.com",
				password: SEED_PASSWORD,
			},
		});
		expect(response.status).toBe(422);
		expect(response.body.errors?.[0]?.field).toBe("email");
	});

	test("an unverified user cannot log in", async () => {
		const response = await request("POST", "/auth/login", {
			body: { email: "jane@example.com", password: SEED_PASSWORD },
		});
		expect(response.status).toBe(400);
		expect(response.body.errors?.[0]?.field).toBe("email");
	});

	test("forgot-password answers 200 for an unknown email and queues nothing", async () => {
		const before = queuedMails.length;
		const response = await request("POST", "/auth/forgot-password", {
			body: { email: "nobody@example.com" },
		});
		expect(response.status).toBe(200);
		expect(queuedMails.length).toBe(before);
	});
});

describe("GET /profile", () => {
	test("answers 401 without a token", async () => {
		const response = await request("GET", "/profile");
		expect(response.status).toBe(401);
		expect(response.body.success).toBe(false);
	});

	test("answers 401 for a garbage token", async () => {
		const response = await request("GET", "/profile", { token: "garbage" });
		expect(response.status).toBe(401);
	});

	test("returns the current user with roles and permissions", async () => {
		const { accessToken } = await login("admin@example.com");
		const response = await request<{
			email: string;
			roles: string[];
			permissions: string[];
		}>("GET", "/profile", { token: accessToken });
		expect(response.status).toBe(200);
		expect(response.body.data?.email).toBe("admin@example.com");
		expect(response.body.data?.roles).toEqual(["admin"]);
		expect(response.body.data?.permissions).toHaveLength(15);
		expect(response.body.data?.permissions).toContain("user list");
	});
});
