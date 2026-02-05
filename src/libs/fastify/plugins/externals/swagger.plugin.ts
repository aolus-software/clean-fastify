import fastifySwagger from "@fastify/swagger";
import fp from "fastify-plugin";
import ScalarApiReference from "@scalar/fastify-api-reference";
import { AppConfig } from "@config";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export default fp(
	async function (fastify) {
		// Register Swagger first (without await)
		await fastify.register(fastifySwagger, {
			openapi: {
				info: {
					title: AppConfig.APP_NAME,
					version: "1.0.0",
				},
				components: {
					securitySchemes: {
						BearerAuth: {
							type: "http",
							scheme: "bearer",
							bearerFormat: "JWT",
							description:
								"Enter your JWT token in the format **Bearer &lt;token>**",
						},
					},
				},
			},
			transform: jsonSchemaTransform,
		});

		// Register Scalar after Swagger
		await fastify.register(ScalarApiReference, {
			routePrefix: "/docs",
			configuration: {
				title: AppConfig.APP_NAME,
				theme: "fastify",
			},
		});
	},
	{
		name: "swagger-plugin",
		dependencies: [],
	},
);
