import { StrongPassword } from "@fastify-libs";
import { createSuccessResponseSchema, UserInformationSchema } from "@utils";
import { z } from "zod";

export const LoginBodySchema = z.object({
	email: z.email().describe("Account email address"),
	password: z.string().min(1).describe("Account password"),
});

export const RegisterBodySchema = z.object({
	name: z.string().min(1).max(255).describe("Full name"),
	email: z.email().max(255).describe("Email address"),
	password: z
		.string()
		.min(8)
		.regex(StrongPassword)
		.describe(
			"Password: upper, lower, digit and symbol, at least 8 characters",
		),
});

export const EmailBodySchema = z.object({
	email: z.email().max(255).describe("Email address"),
});

export const VerifyEmailBodySchema = z.object({
	token: z.string().min(1).describe("Email verification token"),
});

export const ResetPasswordBodySchema = z.object({
	token: z.string().min(1).describe("Password reset token"),
	newPassword: z
		.string()
		.min(8)
		.regex(StrongPassword)
		.describe(
			"New password: upper, lower, digit and symbol, at least 8 characters",
		),
});

export const RefreshTokenBodySchema = z.object({
	refreshToken: z
		.string()
		.min(1)
		.describe("Refresh token from login or a previous refresh"),
});

export const LoginResponseSchema = createSuccessResponseSchema(
	z.object({
		user: UserInformationSchema,
		accessToken: z.string().describe("Access JWT, valid 1 day"),
		refreshToken: z.string().describe("Refresh JWT, valid 7 days"),
	}),
);

export const RefreshTokenResponseSchema = createSuccessResponseSchema(
	z.object({
		accessToken: z.string().describe("New access JWT, valid 1 day"),
		refreshToken: z
			.string()
			.describe(
				"New refresh JWT, valid 7 days; the previous one stops working",
			),
	}),
);
