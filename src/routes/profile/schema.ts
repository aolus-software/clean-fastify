import { StrongPassword } from "@fastify-libs";
import { z } from "zod";

export const UpdateProfileBodySchema = z.object({
	name: z.string().min(1).max(255).describe("Full name"),
	email: z.email().max(255).describe("Email address"),
});

export const UpdatePasswordBodySchema = z.object({
	currentPassword: z.string().min(1).describe("Current password"),
	newPassword: z
		.string()
		.min(8)
		.regex(StrongPassword)
		.describe(
			"New password: upper, lower, digit and symbol, at least 8 characters",
		),
});
