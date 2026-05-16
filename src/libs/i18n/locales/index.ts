import { Locale } from "../types";
import enJson from "./en.json";
import idJson from "./id.json";
import { TranslationKey } from "./keys.generated";

const en = enJson as Record<TranslationKey, string>;
const id = idJson as Record<TranslationKey, string>;

export const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
	en,
	id,
};

export { TRANSLATION_KEYS, type TranslationKey } from "./keys.generated";
