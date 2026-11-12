import { StrToolkit } from "@utils";
import { describe, expect, test } from "bun:test";

describe("StrToolkit.random", () => {
	test("returns the requested length from the alphanumeric set", () => {
		const value = StrToolkit.random(255);
		expect(value).toHaveLength(255);
		expect(value).toMatch(/^[A-Za-z0-9]+$/);
	});

	test("does not repeat", () => {
		expect(StrToolkit.random(32)).not.toBe(StrToolkit.random(32));
	});
});

describe("StrToolkit case helpers", () => {
	test("converts between cases", () => {
		expect(StrToolkit.camel("foo_bar-baz")).toBe("fooBarBaz");
		expect(StrToolkit.snake("fooBar")).toBe("foo_bar");
		expect(StrToolkit.kebab("fooBar")).toBe("foo-bar");
		expect(StrToolkit.studly("foo_bar")).toBe("FooBar");
		expect(StrToolkit.slug("Hello World!")).toBe("hello-world");
	});

	test("slices around a search string", () => {
		expect(StrToolkit.after("a.b.c", ".")).toBe("b");
		expect(StrToolkit.afterLast("a.b.c", ".")).toBe("c");
		expect(StrToolkit.before("a.b.c", ".")).toBe("a");
		expect(StrToolkit.beforeLast("a.b.c", ".")).toBe("a.b");
		expect(StrToolkit.between("[x]", "[", "]")).toBe("x");
	});

	test("masks and limits", () => {
		expect(StrToolkit.mask("secret", "*", 2)).toBe("se****");
		expect(StrToolkit.limit("abcdef", 3)).toBe("abc...");
	});

	test("detects uuids", () => {
		expect(StrToolkit.isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(
			true,
		);
		expect(StrToolkit.isUuid("not-a-uuid")).toBe(false);
	});
});
