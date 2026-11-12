import {
	userFilterableFields,
	userSortableFields,
	usersTable,
} from "@database";
import { BadRequestError } from "@fastify-libs";
import { buildDatatableQueryParamsSchema, DatatableToolkit } from "@utils";
import { describe, expect, test } from "bun:test";
import type { FastifyRequest } from "fastify";

describe("DatatableToolkit.parseFilter", () => {
	test("reads filter[<key>] off the raw URL and applies defaults", () => {
		const request = {
			url: "/settings/users?filter[status]=active&filter[verified]=true&filter[]=x",
			query: {},
		} as unknown as FastifyRequest;
		expect(DatatableToolkit.parseFilter(request)).toEqual({
			page: 1,
			perPage: 10,
			search: undefined,
			sort: "createdAt",
			sortDirection: "desc",
			filter: { status: "active", verified: true },
		});
	});

	test("leaves filter undefined when none is sent", () => {
		const request = {
			url: "/settings/users?page=2",
			query: { page: 2, perPage: 5, search: "" },
		} as unknown as FastifyRequest;
		const parsed = DatatableToolkit.parseFilter(request);
		expect(parsed.filter).toBeUndefined();
		expect(parsed.search).toBeUndefined();
		expect(parsed.page).toBe(2);
		expect(parsed.perPage).toBe(5);
	});
});

describe("DatatableToolkit.parseSort", () => {
	test("maps an allowed key and rejects anything else", () => {
		const columns = { name: usersTable.name };
		expect(DatatableToolkit.parseSort(columns, "name")).toBe(usersTable.name);
		expect(() => DatatableToolkit.parseSort(columns, "password")).toThrow(
			BadRequestError,
		);
	});
});

describe("DatatableToolkit.assertFilter", () => {
	test("accepts allowed keys and enum values", () => {
		expect(() =>
			DatatableToolkit.assertFilter(
				{ status: "active,inactive", name: "a" },
				userFilterableFields,
			),
		).not.toThrow();
		expect(() =>
			DatatableToolkit.assertFilter(undefined, userFilterableFields),
		).not.toThrow();
	});

	test("rejects an unknown key", () => {
		expect(() =>
			DatatableToolkit.assertFilter({ password: "a" }, userFilterableFields),
		).toThrow(BadRequestError);
	});

	test("rejects a value outside the enum", () => {
		expect(() =>
			DatatableToolkit.assertFilter(
				{ status: "deleted" },
				userFilterableFields,
			),
		).toThrow(BadRequestError);
	});
});

describe("DatatableToolkit filter values", () => {
	test("filterValues splits and trims a comma list", () => {
		expect(DatatableToolkit.filterValues(" a, b ,,c ")).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	test("filterDateRange spans whole days and rejects bad input", () => {
		const { from, to } = DatatableToolkit.filterDateRange(
			"2024-01-01,2024-01-31",
			"createdAt",
		);
		expect(from < to).toBe(true);
		expect(() =>
			DatatableToolkit.filterDateRange("2024-02-01,2024-01-01", "createdAt"),
		).toThrow(BadRequestError);
		expect(() =>
			DatatableToolkit.filterDateRange("yesterday", "createdAt"),
		).toThrow(BadRequestError);
		expect(() =>
			DatatableToolkit.filterDateRange("2024-01-01,2024-01-02,2024-01-03", "x"),
		).toThrow(BadRequestError);
	});
});

describe("buildDatatableQueryParamsSchema", () => {
	const schema = buildDatatableQueryParamsSchema({
		sortFields: userSortableFields,
		filterFields: userFilterableFields,
		searchColumns: ["name"],
	});

	test("applies defaults", () => {
		expect(schema.parse({})).toMatchObject({
			page: 1,
			perPage: 10,
			sort: "createdAt",
			sortDirection: "desc",
		});
	});

	test("rejects a sort outside the repository allow-list", () => {
		expect(schema.safeParse({ sort: "password" }).success).toBe(false);
		expect(schema.safeParse({ sort: "email" }).success).toBe(true);
	});

	test("caps perPage at 100", () => {
		expect(schema.safeParse({ perPage: "101" }).success).toBe(false);
	});
});
