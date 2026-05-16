import { AppConfig } from "@config";
import fastifySwagger from "@fastify/swagger";
import ScalarApiReference from "@scalar/fastify-api-reference";
import fp from "fastify-plugin";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

const ACCEPT_LANGUAGE_REF = {
	$ref: "#/components/parameters/AcceptLanguageHeader",
};

const HTTP_METHODS = new Set([
	"get",
	"put",
	"post",
	"delete",
	"options",
	"head",
	"patch",
	"trace",
]);

interface OpenApiOperation {
	parameters?: unknown[];
}

interface OpenApiPathItem {
	[method: string]: unknown;
}

interface OpenApiDocument {
	paths?: Record<string, OpenApiPathItem | undefined>;
}

function attachAcceptLanguage(openapiObject: OpenApiDocument): OpenApiDocument {
	const paths = openapiObject.paths;
	if (!paths) return openapiObject;
	for (const pathItem of Object.values(paths)) {
		if (!pathItem) continue;
		for (const [key, value] of Object.entries(pathItem)) {
			if (!HTTP_METHODS.has(key.toLowerCase())) continue;
			if (!value || typeof value !== "object") continue;
			const operation = value as OpenApiOperation;
			operation.parameters = [
				...(operation.parameters ?? []),
				ACCEPT_LANGUAGE_REF,
			];
		}
	}
	return openapiObject;
}

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
					parameters: {
						AcceptLanguageHeader: {
							name: "Accept-Language",
							in: "header",
							required: false,
							description:
								"Preferred response language. Supported values: `en` (default), `id`.",
							schema: {
								type: "string",
								enum: ["en", "id"],
								default: "en",
							},
						},
					},
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
			transformObject: (obj) => {
				if ("openapiObject" in obj) {
					attachAcceptLanguage(obj.openapiObject);
					return obj.openapiObject;
				}
				return obj.swaggerObject;
			},
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
