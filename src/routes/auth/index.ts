import { t } from "@i18n";
import { AuthService } from "@services";
import {
	BadRequestResponseSchema,
	NullCreatedResponseSchema,
	NullSuccessResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import {
	EmailBodySchema,
	LoginBodySchema,
	LoginResponseSchema,
	RefreshTokenBodySchema,
	RefreshTokenResponseSchema,
	RegisterBodySchema,
	ResetPasswordBodySchema,
	VerifyEmailBodySchema,
} from "./schema";

export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	// ======================
	// POST: /auth/login
	// ======================
	app.post(
		"/login",
		{
			schema: {
				tags: ["Auth"],
				summary: "Log in",
				description:
					"Exchange email and password for an access token (1 day) and a refresh token (7 days). Unknown email and wrong password get the same 400.",
				body: LoginBodySchema,
				response: {
					200: LoginResponseSchema,
					400: BadRequestResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const authService = fastify.di.resolve(AuthService);
			const user = await authService.login(
				request.body.email,
				request.body.password,
			);
			const tokens = await authService.issueTokens(fastify.jwt, user.id);

			return ResponseToolkit.success(
				reply,
				{ user, ...tokens },
				t("auth.loginSuccess"),
			);
		},
	);

	// ======================
	// POST: /auth/register
	// ======================
	app.post(
		"/register",
		{
			schema: {
				tags: ["Auth"],
				summary: "Register",
				description:
					"Create an unverified account and email a verification link. A live account with the same email is a 422.",
				body: RegisterBodySchema,
				response: {
					201: NullCreatedResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			await fastify.di.resolve(AuthService).register(request.body);
			return ResponseToolkit.success(
				reply,
				null,
				t("auth.registerSuccess"),
				201,
			);
		},
	);

	// ======================
	// POST: /auth/resend-verification
	// ======================
	app.post(
		"/resend-verification",
		{
			schema: {
				tags: ["Auth"],
				summary: "Resend verification email",
				description:
					"Always 200, whether or not the email exists or is already verified, so the response reveals nothing about the account.",
				body: EmailBodySchema,
				response: {
					200: NullSuccessResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(AuthService)
				.resendVerification(request.body.email);
			return ResponseToolkit.success(
				reply,
				null,
				t("auth.resendVerificationSent"),
			);
		},
	);

	// ======================
	// POST: /auth/verify-email
	// ======================
	app.post(
		"/verify-email",
		{
			schema: {
				tags: ["Auth"],
				summary: "Verify email",
				description:
					"Consume a verification token. An unknown, expired, or already-used token is a 400.",
				body: VerifyEmailBodySchema,
				response: {
					200: NullSuccessResponseSchema,
					400: BadRequestResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			await fastify.di.resolve(AuthService).verifyEmail(request.body.token);
			return ResponseToolkit.success(reply, null, t("auth.emailVerified"));
		},
	);

	// ======================
	// POST: /auth/forgot-password
	// ======================
	app.post(
		"/forgot-password",
		{
			schema: {
				tags: ["Auth"],
				summary: "Request a password reset",
				description:
					"Always 200, whether or not the email exists. Issuing a link revokes earlier unused links.",
				body: EmailBodySchema,
				response: {
					200: NullSuccessResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			await fastify.di.resolve(AuthService).forgotPassword(request.body.email);
			return ResponseToolkit.success(reply, null, t("auth.forgotPasswordSent"));
		},
	);

	// ======================
	// POST: /auth/reset-password
	// ======================
	app.post(
		"/reset-password",
		{
			schema: {
				tags: ["Auth"],
				summary: "Reset password",
				description:
					"Consume a reset token and set a new password. Ends the user's sessions. An unknown, expired, or already-used token is a 400.",
				body: ResetPasswordBodySchema,
				response: {
					200: NullSuccessResponseSchema,
					400: BadRequestResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(AuthService)
				.resetPassword(request.body.token, request.body.newPassword);
			return ResponseToolkit.success(reply, null, t("auth.passwordReset"));
		},
	);

	// ======================
	// POST: /auth/refresh
	// ======================
	app.post(
		"/refresh",
		{
			schema: {
				tags: ["Auth"],
				summary: "Refresh tokens",
				description:
					"Exchange the current refresh token for a new pair. Only a refresh token signed with JWT_REFRESH_SECRET and carrying type 'refresh' is accepted; an access token is rejected. The old refresh token stops working.",
				body: RefreshTokenBodySchema,
				response: {
					200: RefreshTokenResponseSchema,
					401: UnauthorizedResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const tokens = await fastify.di
				.resolve(AuthService)
				.refresh(fastify.jwt, request.body.refreshToken);
			return ResponseToolkit.success(reply, tokens, t("auth.tokenRefreshed"));
		},
	);
}
