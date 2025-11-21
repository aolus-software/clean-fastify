import { FastifyInstance } from "fastify";
import { ProfileHandler } from "../handlers";

export const registerProfileRoutes = (app: FastifyInstance) => {
	app.register(
		(instance) => {
			// All routes in this group will require authentication
			instance.addHook("onRequest", instance.authenticate);

			instance.get("/", async (request, reply) => {
				return ProfileHandler.profile(request, reply);
			});

			instance.patch("/", async (request, reply) => {
				return ProfileHandler.updateProfile(request, reply);
			});

			instance.patch("/password", async (request, reply) => {
				return ProfileHandler.updatePassword(request, reply);
			});

			// Add more profile-related routes here
			// instance.put("/", ProfileHandler.updateProfile);
			// instance.delete("/", ProfileHandler.deleteProfile);
		},
		{ prefix: "/profile" },
	);
};
