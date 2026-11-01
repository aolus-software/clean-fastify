import {
	userFilterableFields,
	userFilterExample,
	userSearchColumns,
	userSortableFields,
	UserStatus,
} from "@database";
import { StrongPassword } from "@fastify-libs";
import { buildDatatableQueryParamsSchema } from "@utils";
import { z } from "zod";

const UserStatusSchema = z.enum(UserStatus).describe("Account status");

const StrongPasswordSchema = z
	.string()
	.min(8)
	.regex(StrongPassword)
	.describe("Password: upper, lower, digit and symbol, at least 8 characters");

export const UserQuerySchema = buildDatatableQueryParamsSchema({
	sortFields: userSortableFields,
	filterFields: userFilterableFields,
	filterExample: userFilterExample,
	searchColumns: userSearchColumns,
});

export const UserIdParamsSchema = z.object({
	id: z.uuid().describe("User ID"),
});

export const UserListSchema = z.object({
	id: z.uuid().describe("User ID"),
	name: z.string().describe("Full name"),
	email: z.string().describe("Email address"),
	status: UserStatusSchema,
	remark: z.string().nullable().describe("Free-text note"),
	roles: z.array(z.string()).describe("Role names"),
	createdAt: z.date().describe("Created at"),
	updatedAt: z.date().describe("Updated at"),
});

export const UserDetailSchema = UserListSchema.extend({
	roles: z
		.array(z.object({ id: z.uuid(), name: z.string() }))
		.describe("Assigned roles"),
});

export const UserCreateSchema = z.object({
	name: z.string().min(1).max(255).describe("Full name"),
	email: z.email().max(255).describe("Email address"),
	password: StrongPasswordSchema,
	status: UserStatusSchema,
	remark: z.string().max(255).nullable().describe("Free-text note, or null"),
	roleIds: z.array(z.uuid()).describe("IDs of the roles to assign"),
});

export const UserUpdateSchema = UserCreateSchema.omit({ password: true });

export const UserResetPasswordSchema = z.object({
	newPassword: StrongPasswordSchema,
});
