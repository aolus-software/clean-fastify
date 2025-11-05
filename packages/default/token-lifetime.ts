import { DateToolkit } from "@toolkit/date";

export const accessTokenLifetime = DateToolkit.addHours(
	DateToolkit.now(),
	1,
).toDate();

export const verificationTokenLifetime = DateToolkit.addHours(
	DateToolkit.now(),
	1,
).toDate();

export const autoDeleteTokenLifetime = DateToolkit.addMonths(
	DateToolkit.now(),
	1,
).toDate();
