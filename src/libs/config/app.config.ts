import { env } from "./env.config";

interface IAppConfig {
	APP_NAME: string;
	APP_PORT: number;
	APP_URL: string;
	APP_ENV: "development" | "staging" | "production";
	APP_TIMEZONE: string;
	APP_KEY: string;
	LOG_LEVEL: "info" | "warn" | "debug";
	ENABLE_API_DOCS: boolean;
	CLIENT_URL: string;
}

export const AppConfig: IAppConfig = {
	APP_NAME: env.APP_NAME,
	APP_PORT: env.APP_PORT,
	APP_URL: env.APP_URL,
	APP_ENV: env.NODE_ENV,
	APP_TIMEZONE: env.APP_TIMEZONE,
	APP_KEY: env.APP_KEY,
	LOG_LEVEL: env.LOG_LEVEL,
	ENABLE_API_DOCS: env.ENABLE_API_DOCS,
	CLIENT_URL: env.CLIENT_URL,
};
