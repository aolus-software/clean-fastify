import { TranslationKey } from "./locales";
import { TranslationVars } from "./types";

interface ZodIssueLike {
	code?: string;
	expected?: string;
	received?: string;
	format?: string;
	validation?: string;
	type?: string;
	path?: (string | number)[];
	message?: string;
	schema?: { format?: string; pattern?: string };
}

const FORMAT_KEYS: Record<string, TranslationKey> = {
	email: "validation.expectedEmail",
	uuid: "validation.expectedUuid",
	datetime: "validation.expectedDateTime",
	"date-time": "validation.expectedDateTime",
	regex: "validation.patternMismatch",
};

const EXPECTED_KEYS: Record<string, TranslationKey> = {
	string: "validation.expectedString",
	number: "validation.expectedNumber",
	boolean: "validation.expectedBoolean",
	array: "validation.expectedArray",
	object: "validation.expectedObject",
};

export const translateValidationIssue = (
	issue: ZodIssueLike,
): { key: TranslationKey; vars?: TranslationVars } => {
	const format = issue.format ?? issue.validation ?? issue.schema?.format;
	if (format && FORMAT_KEYS[format]) {
		return { key: FORMAT_KEYS[format] };
	}

	if (issue.code === "invalid_type") {
		if (issue.received === "undefined" || issue.received === "null") {
			return { key: "validation.required" };
		}
		if (issue.expected && EXPECTED_KEYS[issue.expected]) {
			return { key: EXPECTED_KEYS[issue.expected] };
		}
	}

	if (issue.code === "too_small") {
		if (issue.type === "string" || issue.expected === "string") {
			return { key: "validation.tooShort" };
		}
		return { key: "validation.tooSmall" };
	}

	if (issue.code === "too_big") {
		if (issue.type === "string" || issue.expected === "string") {
			return { key: "validation.tooLong" };
		}
		return { key: "validation.tooLarge" };
	}

	if (issue.code === "invalid_string" || issue.code === "invalid_format") {
		return { key: "validation.patternMismatch" };
	}

	const message = (issue.message ?? "").toLowerCase();
	if (message.includes("required")) return { key: "validation.required" };
	if (message.includes("expected string") && message.includes("greater"))
		return { key: "validation.tooShort" };
	if (message.includes("expected string") && message.includes("less"))
		return { key: "validation.tooLong" };
	if (message.includes("expected number to be greater"))
		return { key: "validation.tooSmall" };
	if (message.includes("expected number to be less"))
		return { key: "validation.tooLarge" };
	if (message.includes("expected string"))
		return { key: "validation.expectedString" };
	if (message.includes("expected number"))
		return { key: "validation.expectedNumber" };
	if (message.includes("expected boolean"))
		return { key: "validation.expectedBoolean" };
	if (message.includes("expected array"))
		return { key: "validation.expectedArray" };
	if (message.includes("expected object"))
		return { key: "validation.expectedObject" };

	return { key: "validation.invalid" };
};

export const issueFieldName = (issue: ZodIssueLike): string => {
	if (Array.isArray(issue.path) && issue.path.length > 0) {
		return issue.path.map((p) => String(p)).join(".");
	}
	return "body";
};
