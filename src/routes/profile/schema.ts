import { StrongPassword } from "@fastify-libs";
import {
	createSuccessResponseSchema,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
} from "@utils";
import { z } from "zod";

// Body Schemas
export const UpdateProfileBodySchema = z.object({
	name: z.string().min(2).max(255).describe("User's full name"),
	email: z.string().email().describe("User's email address"),
});

export const UpdatePasswordBodySchema = z.object({
	currentPassword: z.string().describe("Current password"),
	password: z
		.string()
		.regex(StrongPassword)
		.describe("New password (must be strong)"),
});

// Response Schemas
export const ProfileResponseSchema = createSuccessResponseSchema(
	z.object({
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
);

export const SuccessResponseSchema = createSuccessResponseSchema(z.object({}));

export {
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
};
