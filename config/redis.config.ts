import { cleanEnv, str, num } from "envalid";

const env = cleanEnv(process.env, {
	REDIS_HOST: str({ default: "localhost" }),
	REDIS_PORT: num({ default: 6379 }),
	REDIS_PASSWORD: str({ default: "" }),
	REDIS_DB: num({ default: 0 }),
});

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
