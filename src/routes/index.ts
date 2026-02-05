import { AppConfig } from "@config/app.config";
import { DateToolkit, ResponseToolkit } from "@utils";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export default function (fastify: FastifyInstance) {
	fastify.withTypeProvider<ZodTypeProvider>().get(
		"/",
		{
			schema: {
				tags: ["Index"],
				description: "Returns a welcome message indicating the API is running.",
				response: {
					200: z.object({
						status: z.number(),
						success: z.boolean(),
						message: z.string(),
						data: z.object({
							AppName: z.string(),
							AppTimezone: z.string(),
							AppEnvironment: z.string(),
							CurrentTime: z.string(),
						}),
					}),
					500: z.object({
						status: z.number(),
						success: z.boolean(),
						message: z.string(),
					}),
				},
			},
		},
		async (_request: FastifyRequest, reply: FastifyReply) => {
			return ResponseToolkit.success<{
				AppName: string;
				AppTimezone: string;
				AppEnvironment: string;
				CurrentTime: string;
			}>(
				reply,
				{
					AppName: AppConfig.APP_NAME,
					AppTimezone: AppConfig.APP_TIMEZONE,
					AppEnvironment: AppConfig.APP_ENV,
					CurrentTime: DateToolkit.getDateTimeInformativeWithTimezone(
						DateToolkit.now(),
					),
				},
				"API is running successfully.",
				200,
			);
		},
	);
}
