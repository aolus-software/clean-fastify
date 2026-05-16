import { RedisClient } from "@database";
import { EmailOptions } from "@libs/mail/mail.service";
import { Queue } from "bullmq";

const queueRedis = RedisClient.getQueueRedisClient();

export const sendEmailQueue = new Queue<EmailOptions>("send-email", {
	connection: queueRedis,
});
