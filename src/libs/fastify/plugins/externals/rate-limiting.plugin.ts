import fastifyRateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";
import { RedisConfig } from "@config";
import type { FastifyRequest } from "fastify";

export default fp(
	async function (fastify) {
		await fastify.register(fastifyRateLimit, {
			// Global rate limit: 100 requests per minute
			max: 100,
			timeWindow: "1 minute",

			// Use Redis as storage for distributed rate limiting
			redis: fastify.redis,

			// Custom key generator (use IP + user ID if authenticated)
			keyGenerator: (request: FastifyRequest) => {
				const ip =
					request.headers["x-forwarded-for"] ||
					request.headers["x-real-ip"] ||
					request.ip;

				const ips = Array.isArray(ip) ? ip.join(",") : ip;
				return `rate-limit:${ips}`;
			},

			// Skip rate limiting for health checks
			skipOnError: false,

			// Error response
			errorResponseBuilder: (_request: FastifyRequest, context) => {
				return {
					status: 429,
					success: false,
					message: "Too many requests. Please try again later.",
					retryAfter: context.ttl,
				};
			},

			// Enable rate limit headers
			addHeadersOnExceeding: {
				"x-ratelimit-limit": true,
				"x-ratelimit-remaining": true,
				"x-ratelimit-reset": true,
			},
			addHeaders: {
				"x-ratelimit-limit": true,
				"x-ratelimit-remaining": true,
				"x-ratelimit-reset": true,
				"retry-after": true,
			},

			// Enable for all routes by default
			global: true,
		});

		// Add hook to skip rate limiting for specific routes
		fastify.addHook("onRequest", async (request, _reply) => {
			// Skip rate limiting for health checks and metrics
			if (request.url === "/health" || request.url === "/metrics") {
				// @ts-expect-error - rate limit skip flag
				request.skipRateLimit = true;
			}
		});

		// Log rate limit configuration
		fastify.log.info({
			msg: "Rate limiting enabled",
			redis: `${RedisConfig.REDIS_HOST}:${RedisConfig.REDIS_PORT}`,
			max: 100,
			timeWindow: "1 minute",
		});
	},
	{
		name: "rate-limiting-plugin",
		dependencies: ["@fastify/redis"],
	},
);
