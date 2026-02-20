import { RedisClient } from "@database";
import { EmailOptions, EmailService } from "@libs/mail/mail.service";
import { logger } from "@utils";
import { Worker } from "bullmq";

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
