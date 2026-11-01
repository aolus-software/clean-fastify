import { corsConfig } from "@config";
import fastifyCors from "@fastify/cors";
import fp from "fastify-plugin";

/** ALLOWED_HOST empty allows every origin; otherwise only the listed origins are allowed. */
export default fp(
	async function (fastify) {
		await fastify.register(fastifyCors, {
			origin: corsConfig.origin,
			methods: corsConfig.methods,
			allowedHeaders: corsConfig.allowedHeaders,
			credentials: corsConfig.credentials,
			maxAge: corsConfig.maxAge,
		});
	},
	{ name: "cors-plugin" },
);
