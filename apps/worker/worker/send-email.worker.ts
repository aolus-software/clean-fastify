import { Worker } from "bullmq";
import { EmailOptions, EmailService } from "@packages/mail/mail.service";
import { RedisClient } from "infra/redis/redis-client";
import { logger } from "@packages";

const queueRedis = RedisClient.getQueueRedisClient();

const worker = new Worker<EmailOptions>(
	"send-email",
	async (job) => {
		try {
			await EmailService.sendEmail(job.data);
			logger.info({}, `Email job processed for ${job.data.to}`);
		} catch (error) {
			logger.error(error, `Failed to process email job for ${job.data.to}`);
			throw error;
		}
	},
	{
		connection: queueRedis,
	},
);

worker.on("failed", (job, err) => {
	logger.error(err, `Job ${job ? job.id : "unknown"} failed`);
});

export { worker };
