import { env } from "./env.config";

interface IRedisConfig {
	REDIS_HOST: string;
	REDIS_PORT: number;
	REDIS_PASSWORD: string | undefined;
	REDIS_DB: number;
}

export const RedisConfig: IRedisConfig = {
	REDIS_HOST: env.REDIS_HOST,
	REDIS_PORT: env.REDIS_PORT,
	REDIS_PASSWORD: env.REDIS_PASSWORD || undefined,
	REDIS_DB: env.REDIS_DB,
};
