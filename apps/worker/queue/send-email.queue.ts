import { Queue } from "bullmq";
import { RedisClient } from "infra/redis/redis-client";

const queueRedis = RedisClient.getQueueRedisClient();

export const sendEmailQueue = new Queue("send-email", {
	connection: queueRedis,
});
