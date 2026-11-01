import { DateToolkit } from "@utils";

/**
 * Lifetimes are functions called at issue time. A module-scope constant would freeze the expiry at
 * process start, so every token minted after the first hour of uptime would arrive already expired.
 */
export const verificationTokenLifetime = (): Date =>
	DateToolkit.addHours(DateToolkit.now(), 1).toDate();

export const resetPasswordLifetime = (): Date =>
	DateToolkit.addHours(DateToolkit.now(), 1).toDate();
