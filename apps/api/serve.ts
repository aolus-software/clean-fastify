import fastify from "fastify";
import { AppConfig, RedisConfig } from "@config/app.config";
import { registerRoutes } from "./routes";
import fastifyJwt from "@fastify/jwt";
import fastifyRedis from "@fastify/redis";
import corsPlugin from "packages/plugins/cors.plugin";
import authPlugin from "packages/plugins/auth.plugin";
import { errorHandler } from "./error/error.handler";
import { createLoggerConfig } from "packages/logger/logger";

const app = fastify({
	logger: createLoggerConfig(),
});

// PLUGIN DECORATOR =====================================================
app.register(fastifyJwt, {
	secret: AppConfig.APP_JWT_SECRET,
});

app.register(corsPlugin);
app.register(authPlugin);

app.register(fastifyRedis, {
	host: RedisConfig.REDIS_HOST,
	port: RedisConfig.REDIS_PORT,
	password: RedisConfig.REDIS_PASSWORD,
	db: RedisConfig.REDIS_DB,
});

registerRoutes(app);

// Error Handler ==========================================
app.setErrorHandler(errorHandler);

app.listen({ port: AppConfig.APP_PORT }, (err, address) => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}

	// eslint-disable-next-line no-console
	console.log(`Server listening at ${address}`);
});
