import { FastifyInstance } from "fastify";
import { HomeHandler } from "../handlers/home.handler";
import { registerAuthRoutes } from "./auth.routes";
import { registerProfileRoutes } from "./profile.routes";

export const registerRoutes = (app: FastifyInstance) => {
	app.get("/", HomeHandler.home);
	app.get("/health", HomeHandler.health);

	registerAuthRoutes(app);
	registerProfileRoutes(app);
};
