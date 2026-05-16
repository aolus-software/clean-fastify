import { RedisConfig } from "@config";
import { RedisClient as BunRedisClient } from "bun";
import IORedis from "ioredis";

function buildRedisUrl(): string {
	const auth = RedisConfig.REDIS_PASSWORD
		? `:${encodeURIComponent(RedisConfig.REDIS_PASSWORD)}@`
		: "";
	return `redis://${auth}${RedisConfig.REDIS_HOST}:${RedisConfig.REDIS_PORT}/${RedisConfig.REDIS_DB}`;
}

export class RedisClient {
	private static redis: BunRedisClient | null = null;
	private static queueRedis: IORedis | null = null;

	static getRedisClient(): BunRedisClient {
		if (!this.redis) {
			this.redis = new BunRedisClient(buildRedisUrl());
		}

		return this.redis;
	}

	static getQueueRedisClient(): IORedis {
		if (!this.queueRedis) {
			this.queueRedis = new IORedis({
				host: RedisConfig.REDIS_HOST,
				port: RedisConfig.REDIS_PORT,
				password: RedisConfig.REDIS_PASSWORD || undefined,
				maxRetriesPerRequest: null,
				db: RedisConfig.REDIS_DB,
			});
		}

		return this.queueRedis;
	}
}
