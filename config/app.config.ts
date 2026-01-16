import { cleanEnv, str, num, url } from "envalid";

const env = cleanEnv(process.env, {
	APP_NAME: str({ default: "Hono App" }),
	APP_PORT: num({ default: 3000 }),
	APP_URL: url({ default: "http://localhost:3000" }),
	APP_ENV: str({
		default: "development",
		choices: ["development", "staging", "production"],
	}),
	APP_TIMEZONE: str({ default: "UTC" }),
	APP_KEY: str({ default: "your-app-key" }),
	APP_JWT_SECRET: str({ default: "jwt-secret" }),
	APP_JWT_EXPIRES_IN: num({ default: 3600 }),
	APP_JWT_REFRESH_SECRET: str({ default: "jwt-refresh-secret" }),
	APP_JWT_REFRESH_EXPIRES_IN: num({ default: 604800 }),
	LOG_LEVEL: str({ default: "info", choices: ["info", "warn", "debug"] }),
	CLIENT_URL: url({ default: "http://localhost:3000" }),
});

interface IAppConfig {
	APP_NAME: string;
	APP_PORT: number;
	APP_URL: string;
	APP_ENV: "development" | "staging" | "production";
	APP_TIMEZONE: string;
	APP_KEY: string;
	APP_JWT_SECRET: string;
	APP_JWT_EXPIRES_IN: number;
	APP_JWT_REFRESH_SECRET: string;
	APP_JWT_REFRESH_EXPIRES_IN: number;

	// log
	LOG_LEVEL: "info" | "warn" | "debug";

	// client
	CLIENT_URL: string;
}

export const AppConfig: IAppConfig = {
	APP_NAME: env.APP_NAME,
	APP_PORT: env.APP_PORT,
	APP_URL: env.APP_URL,
	APP_ENV: env.APP_ENV,
	APP_TIMEZONE: env.APP_TIMEZONE,
	APP_KEY: env.APP_KEY,
	APP_JWT_SECRET: env.APP_JWT_SECRET,
	APP_JWT_EXPIRES_IN: env.APP_JWT_EXPIRES_IN,
	APP_JWT_REFRESH_SECRET: env.APP_JWT_REFRESH_SECRET,
	APP_JWT_REFRESH_EXPIRES_IN: env.APP_JWT_REFRESH_EXPIRES_IN,
	LOG_LEVEL: env.LOG_LEVEL,
	CLIENT_URL: env.CLIENT_URL,
};
