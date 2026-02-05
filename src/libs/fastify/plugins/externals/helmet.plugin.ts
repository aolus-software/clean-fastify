import fastifyHelmet from "@fastify/helmet";
import fp from "fastify-plugin";

export default fp(
	async function (fastify) {
		await fastify.register(fastifyHelmet, {
			// Content Security Policy
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'", "'unsafe-inline'"],
					imgSrc: ["'self'", "data:", "https:"],
					fontSrc: ["'self'", "data:"],
					connectSrc: ["'self'"],
					frameSrc: ["'none'"],
					objectSrc: ["'none'"],
					baseUri: ["'self'"],
					formAction: ["'self'"],
					frameAncestors: ["'none'"],
					upgradeInsecureRequests: [],
				},
			},
			// Security headers
			global: true,
			hidePoweredBy: true,
			hsts: {
				maxAge: 31536000, // 1 year
				includeSubDomains: true,
				preload: true,
			},
			noSniff: true,
			xssFilter: true,
			referrerPolicy: { policy: "strict-origin-when-cross-origin" },
		});
	},
	{
		name: "helmet-plugin",
		dependencies: [],
	},
);
