import { dictionaries } from "./locales";
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES } from "./types";

const isSupportedLocale = (value: string): value is Locale =>
	(SUPPORTED_LOCALES as readonly string[]).includes(value);

const normalize = (tag: string): string =>
	tag.trim().toLowerCase().split("-")[0];

export const parseAcceptLanguage = (
	header: string | null | undefined,
): Locale => {
	if (!header) return DEFAULT_LOCALE;

	const candidates = header
		.split(",")
		.map((part) => {
			const [tag, ...params] = part.split(";").map((p) => p.trim());
			const qParam = params.find((p) => p.startsWith("q="));
			const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
			return { tag: normalize(tag), q: Number.isFinite(q) ? q : 0 };
		})
		.filter((c) => c.tag.length > 0 && c.q > 0)
		.sort((a, b) => b.q - a.q);

	for (const { tag } of candidates) {
		if (isSupportedLocale(tag) && tag in dictionaries) return tag;
	}

	return DEFAULT_LOCALE;
};
