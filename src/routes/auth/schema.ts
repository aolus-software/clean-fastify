import { StrongPassword } from "@fastify-libs";
import {
	createSuccessResponseSchema,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
} from "@utils";
import { z } from "zod";

// Body Schemas
export const LoginBodySchema = z.object({
	email: z.string().email().describe("User's email address"),
	password: z.string().describe("User's password"),
});

export const RegisterBodySchema = z.object({
	name: z.string().min(2).max(255).describe("User's full name"),
	email: z.string().email().describe("User's email address"),
	password: z.string().regex(StrongPassword).describe("User's password"),
});

export const ResendVerificationBodySchema = z.object({
	email: z.string().email().describe("User's email address"),
});

export const VerifyEmailBodySchema = z.object({
	token: z.string().describe("Email verification token"),
});

export const ForgotPasswordBodySchema = z.object({
	email: z.string().email().describe("User's email address"),
});

export const ResetPasswordBodySchema = z.object({
	token: z.string().describe("Password reset token"),
	newPassword: z.string().regex(StrongPassword).describe("New password"),
});

// Response Schemas
export const LoginResponseSchema = createSuccessResponseSchema(
	z.object({
		accessToken: z.string().describe("JWT access token"),
		refreshToken: z.string().describe("JWT refresh token"),
		user: z.object({
			id: z.string().describe("User ID"),
			email: z.string().describe("User email"),
			name: z.string().describe("User name"),
			roles: z.array(z.string()).describe("User roles"),
			permissions: z
				.array(
					z.object({
						name: z.string().describe("role name"),
						permissions: z.array(z.string()).describe("permissions"),
					}),
				)
				.describe("User permissions"),
		}),
	}),
	200,
);

export const RefreshTokenBodySchema = z.object({
	refreshToken: z.string().describe("Refresh token"),
});

export const RefreshTokenResponseSchema = createSuccessResponseSchema(
	z.object({
		accessToken: z.string().describe("New JWT access token"),
		refreshToken: z.string().describe("New JWT refresh token"),
	}),
	200,
);

export const SuccessResponseSchema = createSuccessResponseSchema(z.object({}));

// Re-export common error responses
export {
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
};
