import { db } from "@database";
import { t } from "@i18n";
import {
	createSuccessResponseSchema,
	DateToolkit,
	ResponseToolkit,
	ServiceUnavailableResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

const ServiceStateSchema = z.enum(["healthy", "unhealthy"]);

export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	// ======================
	// GET: /health
	// ======================
	app.get(
		"",
		{
			schema: {
				tags: ["General"],
				summary: "Health check",
				description:
					"Probes PostgreSQL and Redis. 503 when either probe fails.",
				response: {
					200: createSuccessResponseSchema(
						z.object({
							status: z.literal("healthy"),
							timestamp: z.string().describe("Current time in APP_TIMEZONE"),
							services: z.object({
								database: ServiceStateSchema,
								redis: ServiceStateSchema,
							}),
						}),
					),
					503: ServiceUnavailableResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const services: {
				database: "healthy" | "unhealthy";
				redis: "healthy" | "unhealthy";
			} = { database: "healthy", redis: "healthy" };

			try {
				await db.execute("SELECT 1");
			} catch (error) {
				request.log.error({ error }, "Health probe failed: database");
				services.database = "unhealthy";
			}

			try {
				await fastify.redis.ping();
			} catch (error) {
				request.log.error({ error }, "Health probe failed: redis");
				services.redis = "unhealthy";
			}

			if (services.database !== "healthy" || services.redis !== "healthy") {
				return ResponseToolkit.error(reply, t("health.someUnhealthy"), 503);
			}

			return ResponseToolkit.success(
				reply,
				{
					status: "healthy" as const,
					timestamp: DateToolkit.getDateTimeInformativeWithTimezone(
						DateToolkit.now(),
					),
					services,
				},
				t("health.allHealthy"),
			);
		},
	);
}
