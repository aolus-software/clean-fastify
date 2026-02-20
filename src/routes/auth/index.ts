import { AppConfig } from "@config";
import { UnprocessableEntityError } from "@fastify-libs";
import { AuthService } from "@services";
import { UserInformation } from "@types";
import { ResponseToolkit, StrToolkit } from "@utils";
import { FastifyInstance } from "fastify";

import {
	ForgotPasswordBodySchema,
	LoginBodySchema,
	LoginResponseSchema,
	RefreshTokenBodySchema,
	RefreshTokenResponseSchema,
	RegisterBodySchema,
	ResendVerificationBodySchema,
	ResetPasswordBodySchema,
	ServerErrorResponseSchema,
	SuccessResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
	VerifyEmailBodySchema,
} from "./schema";

export default function (fastify: FastifyInstance) {
	// ======================
	// POST: /auth/login
	// ======================
	fastify.post(
		"/login",
		{
			schema: {
				tags: ["Auth"],
				description: "User login endpoint.",
				body: LoginBodySchema,
				response: {
					200: LoginResponseSchema,
					401: UnauthorizedResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const authService = fastify.di.resolve(AuthService);
			const { email, password } = request.body as {
				email: string;
				password: string;
			};

			const userInfo = await authService.login(email, password);

			const accessToken = await reply.jwtSign(
				{ id: userInfo.id },
				{ expiresIn: `${AppConfig.APP_JWT_EXPIRES_IN}s` },
			);

			const refreshToken = await reply.jwtSign(
				{ id: userInfo.id, type: "refresh" },
				{
					expiresIn: `${AppConfig.APP_JWT_REFRESH_EXPIRES_IN}s`,
					jti: StrToolkit.random(32),
				},
			);

			await authService.storeRefreshToken(userInfo.id, refreshToken);

			return ResponseToolkit.success<{
				accessToken: string;
				refreshToken: string;
				user: UserInformation;
			}>(
				reply,
				{
					accessToken,
					refreshToken,
					user: userInfo,
				},
				"Login successful",
				200,
			);
		},
	);

	// ======================
	// POST: /auth/register
	// ======================
	fastify.post(
		"/register",
		{
			schema: {
				tags: ["Auth"],
				description: "User registration endpoint.",
				body: RegisterBodySchema,
				response: {
					201: SuccessResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const authService = fastify.di.resolve(AuthService);
			const { name, email, password } = request.body as {
				name: string;
				email: string;
				password: string;
			};

			await authService.register({ name, email, password });

			return ResponseToolkit.success(reply, {}, "Registration successful", 201);
		},
	);

	// ======================
	// POST: /auth/resend-verification
	// ======================
	fastify.post(
		"/resend-verification",
		{
			schema: {
				tags: ["Auth"],
				description: "Resend email verification endpoint.",
				body: ResendVerificationBodySchema,
				response: {
					200: SuccessResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const service = fastify.di.resolve(AuthService);
			const { email } = request.body as { email: string };
			await service.resendVerification({ email });

			return ResponseToolkit.success(
				reply,
				{},
				"Verification email resent successfully",
				200,
			);
		},
	);

	// ======================
	// POST: /auth/verify-email
	// ======================
	fastify.post(
		"/verify-email",
		{
			schema: {
				tags: ["Auth"],
				description: "Email verification endpoint.",
				body: VerifyEmailBodySchema,
				response: {
					200: SuccessResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const service = fastify.di.resolve(AuthService);
			const { token } = request.body as { token: string };
			await service.verifyEmail({ token });

			return ResponseToolkit.success(
				reply,
				{},
				"Email verified successfully",
				200,
			);
		},
	);

	// ======================
	// POST: /auth/forgot-password
	// ======================
	fastify.post(
		"/forgot-password",
		{
			schema: {
				tags: ["Auth"],
				description: "Forgot password endpoint.",
				body: ForgotPasswordBodySchema,
				response: {
					200: SuccessResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const service = fastify.di.resolve(AuthService);
			const { email } = request.body as { email: string };
			await service.forgotPassword(email);

			return ResponseToolkit.success(
				reply,
				{},
				"Password reset email sent successfully",
				200,
			);
		},
	);

	// ======================
	// POST: /auth/reset-password
	// ======================
	fastify.post(
		"/reset-password",
		{
			schema: {
				tags: ["Auth"],
				description: "Reset password endpoint.",
				body: ResetPasswordBodySchema,
				response: {
					200: SuccessResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const service = fastify.di.resolve(AuthService);
			const { token, newPassword } = request.body as {
				token: string;
				newPassword: string;
			};
			await service.resetPassword(token, newPassword);

			return ResponseToolkit.success(
				reply,
				{},
				"Password reset successfully",
				200,
			);
		},
	);

	// ======================
	// POST: /auth/refresh
	// ======================
	fastify.post(
		"/refresh",
		{
			schema: {
				tags: ["Auth"],
				description: "Refresh access token using refresh token.",
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
			const authService = fastify.di.resolve(AuthService);
			const { refreshToken } = request.body as { refreshToken: string };

			try {
				const decoded = fastify.jwt.verify(refreshToken);

				if (
					typeof decoded === "object" &&
					decoded !== null &&
					"type" in decoded &&
					decoded.type !== "refresh"
				) {
					throw new UnprocessableEntityError("Invalid token type", [
						{
							field: "refreshToken",
							message: "Invalid refresh token",
						},
					]);
				}

				const isValid = await authService.validateRefreshToken(
					refreshToken,
					(decoded as { id: string }).id,
				);

				if (!isValid) {
					throw new UnprocessableEntityError("Invalid refresh token", [
						{
							field: "refreshToken",
							message: "Refresh token has been revoked or is invalid",
						},
					]);
				}

				const newAccessToken = await reply.jwtSign(
					{ id: (decoded as { id: string }).id },
					{ expiresIn: `${AppConfig.APP_JWT_EXPIRES_IN}s` },
				);

				const newRefreshToken = await reply.jwtSign(
					{ id: (decoded as { id: string }).id, type: "refresh" },
					{
						expiresIn: `${AppConfig.APP_JWT_REFRESH_EXPIRES_IN}s`,
						jti: StrToolkit.random(32),
					},
				);

				await authService.storeRefreshToken(
					(decoded as { id: string }).id,
					newRefreshToken,
				);

				return ResponseToolkit.success<{
					accessToken: string;
					refreshToken: string;
				}>(
					reply,
					{
						accessToken: newAccessToken,
						refreshToken: newRefreshToken,
					},
					"Token refreshed successfully",
					200,
				);
			} catch (error) {
				if (error instanceof UnprocessableEntityError) {
					throw error;
				}
				throw new UnprocessableEntityError("Invalid refresh token", [
					{
						field: "refreshToken",
						message: "Invalid or expired refresh token",
					},
				]);
			}
		},
	);
}
