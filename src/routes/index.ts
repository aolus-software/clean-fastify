import { AppConfig } from "@config";
import { t } from "@i18n";
import {
	createSuccessResponseSchema,
	DateToolkit,
	ResponseToolkit,
} from "@utils";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	// ======================
	// GET: /
	// ======================
	app.get(
		"/",
		{
			schema: {
				tags: ["General"],
				summary: "API root",
				description: "Basic information about the API.",
				response: {
					200: createSuccessResponseSchema(
						z.object({
							appName: z.string().describe("APP_NAME"),
							appEnv: z.string().describe("NODE_ENV"),
							date: z.string().describe("Current time in APP_TIMEZONE"),
						}),
					),
				},
			},
		},
		async (_request, reply) => {
			return ResponseToolkit.success(
				reply,
				{
					appName: AppConfig.APP_NAME,
					appEnv: AppConfig.APP_ENV,
					date: DateToolkit.getDateTimeInformativeWithTimezone(
						DateToolkit.now(),
					),
				},
				t("common.apiRunning"),
			);
		},
	);

	// ======================
	// GET: /live
	// ======================
	app.get(
		"/live",
		{
			schema: {
				tags: ["General"],
				summary: "Liveness check",
				description: "200 while the process is up; checks no dependency.",
				response: {
					200: createSuccessResponseSchema(z.object({ alive: z.boolean() })),
				},
			},
		},
		async (_request, reply) => {
			return ResponseToolkit.success(reply, { alive: true }, t("health.alive"));
		},
	);
}
