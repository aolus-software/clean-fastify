import "reflect-metadata";
import { AppConfig } from "@config";
import { createAppInstance } from "./app";

const app = createAppInstance();

const start = async () => {
	try {
		await app.listen({ port: AppConfig.APP_PORT });
		// eslint-disable-next-line no-console
		console.log(`Server listening on port ${AppConfig.APP_PORT}`);
		app.log.info(`Server listening on port ${AppConfig.APP_PORT}`);
	} catch (err) {
		// eslint-disable-next-line no-console
		console.error(err);
		app.log.error(err);
		process.exit(1);
	}
};

const gracefulShutdown = async (signal: string) => {
	// eslint-disable-next-line no-console
	console.log(`Received ${signal}, closing server gracefully...`);
	app.log.info(`Received ${signal}, closing server gracefully...`);

	try {
		await app.close();
		// eslint-disable-next-line no-console
		console.log("Server closed successfully");
		app.log.info("Server closed successfully");
		process.exit(0);
	} catch {
		// eslint-disable-next-line no-console
		console.error("Error during shutdown. Forcing exit.");
		app.log.error("Error during shutdown. Forcing exit.");
		process.exit(1);
	}
};

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
	// eslint-disable-next-line no-console
	console.error("Uncaught exception", err);
	app.log.error({ err }, "Uncaught exception");
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	// eslint-disable-next-line no-console
	console.error("Unhandled rejection", reason);
	app.log.error({ reason }, "Unhandled rejection");
	process.exit(1);
});

void start();
