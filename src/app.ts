import { AppConfig } from "@config/app.config";
import { RedisConfig } from "@config/redis.config";
import fastifyAutoload from "@fastify/autoload";
import fastifyJwt from "@fastify/jwt";
import fastifyRedis from "@fastify/redis";
import { createLoggerConfig } from "@utils";
import fastify from "fastify";
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createAppInstance() {
	const app = fastify({
		logger: createLoggerConfig(),
	}).withTypeProvider<ZodTypeProvider>();

	// INFRASTRUCTURE PLUGINS (JWT, Redis) ===================================
	app.register(fastifyJwt, {
		secret: AppConfig.APP_JWT_SECRET,
	});

	app.register(fastifyRedis, {
		host: RedisConfig.REDIS_HOST,
		port: RedisConfig.REDIS_PORT,
		password: RedisConfig.REDIS_PASSWORD,
		db: RedisConfig.REDIS_DB,
	});

	// SCHEMA VALIDATORS =====================================================
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);

	// SECURITY & EXTERNAL PLUGINS (Helmet, CORS, Rate Limiting, Swagger) ===
	app.register(fastifyAutoload, {
		dir: join(__dirname, "./libs/fastify/plugins/externals"),
		cascadeHooks: true,
		autoHooks: true,
		options: {
			prefix: "/",
		},
	});

	// APPLICATION PLUGINS (Auth, Authorization, DI, Error Handling) ========
	app.register(fastifyAutoload, {
		dir: join(__dirname, "./libs/fastify/plugins/app"),
		cascadeHooks: true,
		autoHooks: true,
	});

	// APPLICATION ROUTES ====================================================
	app.register(fastifyAutoload, {
		dir: join(__dirname, "./routes"),
		cascadeHooks: true,
		autoHooks: true,
	});

	return app;
}
