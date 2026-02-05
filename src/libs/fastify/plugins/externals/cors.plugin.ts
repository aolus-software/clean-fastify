import fastifyCors from "@fastify/cors";
import fp from "fastify-plugin";
import { corsConfig } from "@config";

export default fp(
	async function (fastify) {
		await fastify.register(fastifyCors, {
			origin: (origin, cb) => {
				// Allow requests with no origin (e.g., mobile apps, curl)
				if (!origin) return cb(null, true);

				const hostname = new URL(origin).hostname;
				const allowedOrigins = corsConfig.origin;

				// Allow all origins in development (use with caution)
				if (allowedOrigins === "*") {
					cb(null, true);
					return;
				}

				// Check if hostname is in allowed list
				if (allowedOrigins.includes(hostname)) {
					cb(null, true);
				} else {
					fastify.log.warn({
						msg: "CORS rejected",
						origin,
						hostname,
					});
					cb(new Error("Not allowed by CORS"), false);
				}
			},
			methods: corsConfig.methods,
			allowedHeaders: corsConfig.allowedHeaders,
			exposedHeaders: corsConfig.exposedHeaders,
			credentials: corsConfig.credentials,
			maxAge: corsConfig.maxAge,
		});

		// Log CORS configuration
		fastify.log.info({
			msg: "CORS enabled",
			allowedOrigins: corsConfig.origin,
			methods: corsConfig.methods,
			credentials: corsConfig.credentials,
		});
	},
	{
		name: "cors-plugin",
		dependencies: [],
	},
);
