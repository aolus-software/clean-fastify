import pino from "pino";

import { DateToolkit } from "../date";

interface LoggerOptions {
	level?: pino.Level;
	destination?: string;
	sensitiveKeys?: string[];
}

const defaultSensitiveKeys = [
	"password",
	"password_confirmation",
	"passwordConfirmation",
	"newPassword",
	"oldPassword",
	"token",
	"accessToken",
	"refreshToken",
	"bearer",
	"authorization",
	"api_key",
	"apiKey",
	"secret",
	"credit_card",
	"creditCard",
	"ssn",
	"pin",
	"user.creditCardNumber",
	"headers.authorization",
	"headers.cookie",
	"*.sensitiveField",
	"req.headers.authorization",
	"req.headers.cookie",
	"req.headers.api_key",
	"req.headers.apiKey",
	"req.body.password",
	"req.body.newPassword",
	"req.body.token",
	"req.body.accessToken",
	"req.body.refreshToken",
	"req.body.secret",
	"req.body.ssn",
	"req.body.creditCard",
	"req.body.pin",
	"res.data.token",
	"res.data.accessToken",
	"res.data.refreshToken",
];

/**
 * Only object literals are walked. Class instances (Fastify's request and reply, errors) are left
 * as they are so pino's serializers still see their getters and non-enumerable fields.
 */
const isPlainObject = (v: unknown): v is Record<string, unknown> => {
	if (v === null || typeof v !== "object") return false;
	const proto: unknown = Object.getPrototypeOf(v);
	return proto === Object.prototype || proto === null;
};

const isTokenLikeString = (val: unknown): boolean => {
	if (typeof val !== "string") return false;
	const s = val.trim();
	if (/^bearer\s+/i.test(s)) return true;
	if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(s)) return true;
	if (/^[A-Za-z0-9-_]{32,}$/.test(s)) return true;

	return false;
};

const redactSensitive = (
	obj: unknown,
	sensitiveKeysLower: string[],
): unknown => {
	if (Array.isArray(obj)) {
		return obj.map((item) => redactSensitive(item, sensitiveKeysLower));
	}

	if (!isPlainObject(obj)) return obj;

	const result: Record<string, unknown> = { ...obj };

	for (const key of Object.keys(result)) {
		const value = result[key];
		const keyLower = key.toLowerCase();

		if (
			sensitiveKeysLower.some((k) => keyLower.includes(k)) ||
			isTokenLikeString(value)
		) {
			result[key] = "***REDACTED***";
		} else if (isPlainObject(value) || Array.isArray(value)) {
			result[key] = redactSensitive(value, sensitiveKeysLower);
		} else {
			result[key] = value;
		}
	}

	return result;
};

export const createLoggerConfig = (
	options: LoggerOptions = {},
): pino.LoggerOptions => {
	const { level = "info", sensitiveKeys = defaultSensitiveKeys } = options;

	const sensitiveKeysLower = sensitiveKeys.map((k) => k.toLowerCase());

	return {
		level,
		formatters: {
			level: (label) => {
				return { level: label.toUpperCase() };
			},
		},
		timestamp: () =>
			`,"time":"${DateToolkit.getDateTimeInformative(DateToolkit.now())}"`,
		redact: {
			paths: defaultSensitiveKeys,
			// censor: "***REDACTED***",
			remove: true,
		},
		hooks: {
			logMethod(args, method) {
				if (args.length > 0 && isPlainObject(args[0])) {
					args[0] = redactSensitive(args[0], sensitiveKeysLower);
				}
				return method.apply(this, args);
			},
		},
	};
};

export const createLogger = (options: LoggerOptions = {}) => {
	const { level = "info", destination = "./storage/logs/app.log" } = options;

	return pino(
		createLoggerConfig(options),
		pino.multistream([
			{ level, stream: pino.destination({ dest: destination, mkdir: true }) },
			{ level, stream: process.stdout },
		]),
	);
};
export const logger = createLogger();
