import { Queue } from "bullmq";
import { RedisClient } from "@database";

const queueRedis = RedisClient.getQueueRedisClient();

export const sendEmailQueue = new Queue("send-email", {
	connection: queueRedis,
});
