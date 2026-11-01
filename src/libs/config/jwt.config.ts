import { env } from "./env.config";

interface IJwtConfig {
	ACCESS_SECRET: string;
	ACCESS_EXPIRES_IN: string;
	REFRESH_SECRET: string;
	REFRESH_EXPIRES_IN: string;
	REFRESH_EXPIRES_IN_SECONDS: number;
}

export const JwtConfig: IJwtConfig = {
	ACCESS_SECRET: env.JWT_SECRET,
	ACCESS_EXPIRES_IN: "1d",
	REFRESH_SECRET: env.JWT_REFRESH_SECRET,
	REFRESH_EXPIRES_IN: "7d",
	REFRESH_EXPIRES_IN_SECONDS: 7 * 24 * 60 * 60,
};
