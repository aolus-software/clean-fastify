import { db } from "@infra/postgres";
import { ResponseToolkit } from "@packages/toolkit";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export default function (fastify: FastifyInstance) {
	fastify.withTypeProvider<ZodTypeProvider>();

	fastify.get(
		"",
		{
			schema: {
				tags: ["Health"],
				summary: "Health Check",
				description:
					"Checks the health status of the application and its dependencies.",
				response: {
					200: z.object({
						status: z.number(),
						success: z.boolean(),
						message: z.string(),
						data: z.object({
							database: z.object({
								status: z.string(),
								responseTime: z.number(),
								remarks: z.string(),
							}),
							cache: z.object({
								status: z.string(),
								responseTime: z.number(),
								remarks: z.string(),
							}),
							redis: z.object({
								status: z.string(),
							}),
						}),
					}),
					503: z.object({
						status: z.number(),
						success: z.boolean(),
						message: z.string(),
						data: z.object({
							database: z.object({
								status: z.string(),
								responseTime: z.number(),
								remarks: z.string(),
							}),
							cache: z.object({
								status: z.string(),
								responseTime: z.number(),
								remarks: z.string(),
							}),
							redis: z.object({
								status: z.string(),
							}),
						}),
					}),
				},
			},
		},
		async (_request, reply) => {
			const serviceStatus = {
				database: {
					status: "healthy",
					responseTime: 0,
					remarks: "",
				},
				cache: {
					status: "healthy",
					responseTime: 0,
					remarks: "",
				},
				redis: {
					status: "healthy",
				},
			};

			try {
				await db.execute("SELECT 1");
			} catch (error) {
				let remarks = "";
				if (error instanceof Error) {
					remarks = error.message;
				} else {
					remarks = String(error);
				}

				serviceStatus.database = {
					status: "unhealthy",
					responseTime: 0,
					remarks,
				};
			}

			try {
				const start = Date.now();
				await fastify.redis.ping();
				const end = Date.now();
				serviceStatus.redis = {
					status: "healthy",
				};
				serviceStatus.cache = {
					status: "healthy",
					responseTime: end - start,
					remarks: "Redis cache is operational.",
				};
			} catch (error) {
				let remarks = "";
				if (error instanceof Error) {
					remarks = error.message;
				} else {
					remarks = String(error);
				}
				serviceStatus.cache = {
					status: "unhealthy",
					responseTime: 0,
					remarks,
				};
				serviceStatus.redis = {
					status: "unhealthy",
				};
			}

			const allHealthy = Object.values(serviceStatus).every(
				(service) => service.status === "healthy",
			);

			if (!allHealthy) {
				return ResponseToolkit.error(
					reply,
					"One or more services are unhealthy",
					503,
					serviceStatus,
				);
			}

			return ResponseToolkit.success(
				reply,
				serviceStatus,
				"Service is healthy",
			);
		},
	);
}
