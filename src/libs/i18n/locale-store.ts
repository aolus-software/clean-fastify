import { AsyncLocalStorage } from "node:async_hooks";

import { DEFAULT_LOCALE, Locale } from "./types";

const localeStore = new AsyncLocalStorage<Locale>();

export const enterLocale = (locale: Locale): void => {
	localeStore.enterWith(locale);
};

export const runWithLocale = <T>(locale: Locale, fn: () => T): T => {
	return localeStore.run(locale, fn);
};

export const getCurrentLocale = (): Locale => {
	return localeStore.getStore() ?? DEFAULT_LOCALE;
};
