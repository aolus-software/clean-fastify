interface IRedisConfig {
	REDIS_HOST: string;
	REDIS_PORT: number;
	REDIS_PASSWORD: string | undefined;
	REDIS_DB: number;
}

export const RedisConfig: IRedisConfig = {
	REDIS_HOST: process.env.REDIS_HOST || "localhost",
	REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
	REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
	REDIS_DB: Number(process.env.REDIS_DB) || 0,
};
