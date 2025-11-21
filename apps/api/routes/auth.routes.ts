import { FastifyInstance } from "fastify";
import { AuthHandler } from "../handlers";

export const registerAuthRoutes = (app: FastifyInstance) => {
	app.post("/auth/login", AuthHandler.login);
	app.post("/auth/register", AuthHandler.register);
	app.post("/auth/verify-email", AuthHandler.verifyEmail);
	app.post(
		"/auth/resend-verification-email",
		AuthHandler.resentVerificationEmail,
	);
	app.post("/auth/forgot-password", AuthHandler.forgotPassword);
	app.post("/auth/reset-password", AuthHandler.resetPassword);
};
