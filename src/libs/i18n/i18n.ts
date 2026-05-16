import { getCurrentLocale } from "./locale-store";
import { dictionaries, TRANSLATION_KEYS, TranslationKey } from "./locales";
import { DEFAULT_LOCALE, Locale, TranslationVars } from "./types";

const interpolate = (template: string, vars?: TranslationVars): string => {
	if (!vars) return template;
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
		const value = vars[key];
		return value === undefined ? `{{${key}}}` : String(value);
	});
};

export const translate = (
	key: TranslationKey,
	vars?: TranslationVars,
	locale: Locale = getCurrentLocale(),
): string => {
	const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
	const template = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
	return interpolate(template, vars);
};

export const t = (key: TranslationKey, vars?: TranslationVars): string =>
	translate(key, vars);

export const isTranslationKey = (value: unknown): value is TranslationKey =>
	typeof value === "string" && TRANSLATION_KEYS.has(value as TranslationKey);
