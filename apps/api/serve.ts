import "reflect-metadata";
import { AppConfig } from "config/app.config";
import { createAppInstance } from "./app";

const app = createAppInstance();
app.listen({ port: AppConfig.APP_PORT }, (err, address) => {
	if (err) {
		// eslint-disable-next-line no-console
		console.error("Error starting server:", err);
		app.log.error(err);
		process.exit(1);
	}

	// eslint-disable-next-line no-console
	console.log(`Server listening at ${address}`);
});
