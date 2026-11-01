import fastifyRateLimit from "@fastify/rate-limit";
import { t } from "@i18n";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = "1 minute";

/**
 * Global limiter, 100 requests per minute per client, counted in Redis so every process shares
 * one bucket. The key is `request.ip`, the socket address: client-supplied headers such as
 * X-Forwarded-For are never trusted, because rotating them would mint a fresh bucket per request.
 * Behind a reverse proxy, enable Fastify's `trustProxy` for that proxy rather than reading headers.
 */
export default fp(
	async function (fastify) {
		await fastify.register(fastifyRateLimit, {
			global: true,
			max: RATE_LIMIT_MAX,
			timeWindow: RATE_LIMIT_WINDOW,
			redis: fastify.redis,
			nameSpace: "rate-limit:",
			keyGenerator: (request: FastifyRequest) => request.ip,
			errorResponseBuilder: (_request, context) => ({
				statusCode: context.statusCode,
				message: t("errors.tooManyRequests"),
			}),
		});
	},
	{
		name: "rate-limiting-plugin",
		dependencies: ["@fastify/redis"],
	},
);
