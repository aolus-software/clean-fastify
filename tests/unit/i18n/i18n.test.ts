import {
	isTranslationKey,
	parseAcceptLanguage,
	runWithLocale,
	t,
	translate,
} from "@i18n";
import en from "@i18n/locales/en.json";
import id from "@i18n/locales/id.json";
import { describe, expect, test } from "bun:test";

describe("parseAcceptLanguage", () => {
	test("picks the highest-weighted supported locale", () => {
		expect(parseAcceptLanguage("fr;q=0.9, id-ID;q=0.8")).toBe("id");
		expect(parseAcceptLanguage("en-US,id;q=0.5")).toBe("en");
	});

	test("falls back to en", () => {
		expect(parseAcceptLanguage(undefined)).toBe("en");
		expect(parseAcceptLanguage("fr, de")).toBe("en");
		expect(parseAcceptLanguage("id;q=0")).toBe("en");
	});
});

describe("translate", () => {
	test("resolves a key per locale", () => {
		expect(translate("auth.loginSuccess", undefined, "en")).toBe(
			"Login successful",
		);
		expect(translate("auth.loginSuccess", undefined, "id")).toBe(
			"Berhasil masuk",
		);
	});

	test("interpolates variables and leaves unknown ones", () => {
		expect(
			translate("settings.roles.nameExists", { name: "editor" }, "en"),
		).toBe("The role name editor already exists");
		expect(translate("settings.roles.nameExists", {}, "en")).toBe(
			"The role name {{name}} already exists",
		);
	});

	test("t follows the current locale", () => {
		expect(runWithLocale("id", () => t("auth.loginSuccess"))).toBe(
			"Berhasil masuk",
		);
		expect(t("auth.loginSuccess")).toBe("Login successful");
	});

	test("isTranslationKey checks the generated key set", () => {
		expect(isTranslationKey("auth.loginSuccess")).toBe(true);
		expect(isTranslationKey("auth.nope")).toBe(false);
	});
});

describe("catalogues", () => {
	test("en and id carry the same keys", () => {
		expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
	});
});
