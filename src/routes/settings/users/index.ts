import { PermissionGuard, RoleGuard } from "@fastify-libs";
import { t } from "@i18n";
import { UserService } from "@services";
import {
	BadRequestResponseSchema,
	createSuccessPaginationResponseSchema,
	createSuccessResponseSchema,
	DatatableToolkit,
	ForbiddenResponseSchema,
	NotFoundResponseSchema,
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
	UserCreateSchema,
	UserDetailSchema,
	UserIdParamsSchema,
	UserListSchema,
	UserQuerySchema,
	UserResetPasswordSchema,
	UserUpdateSchema,
} from "./schema";

const TAGS = ["Settings/Users"];
const SECURITY = [{ BearerAuth: [] }];
const ITEM_ERRORS = {
	401: UnauthorizedResponseSchema,
	403: ForbiddenResponseSchema,
	404: NotFoundResponseSchema,
	422: ValidationErrorResponseSchema,
	500: ServerErrorResponseSchema,
};

export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.addHook("onRequest", async (request) => {
		await request.authenticate();
	});

	// ======================
	// GET: /settings/users
	// ======================
	app.get(
		"",
		{
			onRequest: PermissionGuard(["user list"]),
			schema: {
				tags: TAGS,
				summary: "List users",
				description:
					"Paginated live users. Unknown filter key or value is a 400; unknown sort is a 422. Requires 'user list' permission.",
				security: SECURITY,
				querystring: UserQuerySchema,
				response: {
					200: createSuccessPaginationResponseSchema(UserListSchema),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const data = await fastify.di
				.resolve(UserService)
				.findAll(DatatableToolkit.parseFilter(request));
			return ResponseToolkit.success(reply, data, t("settings.users.fetched"));
		},
	);

	// ======================
	// POST: /settings/users
	// ======================
	app.post(
		"",
		{
			onRequest: PermissionGuard(["user create"]),
			schema: {
				tags: TAGS,
				summary: "Create user",
				description:
					"Create a user with roles. A live user with the same email, or an unknown role id, is a 422. Requires 'user create' permission.",
				security: SECURITY,
				body: UserCreateSchema,
				response: {
					201: NullCreatedResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			await fastify.di.resolve(UserService).create(request.body);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.users.created"),
				201,
			);
		},
	);

	// ======================
	// GET: /settings/users/:id
	// ======================
	app.get(
		"/:id",
		{
			onRequest: PermissionGuard(["user detail"]),
			schema: {
				tags: TAGS,
				summary: "Get user",
				description:
					"User detail with assigned roles. Requires 'user detail' permission.",
				security: SECURITY,
				params: UserIdParamsSchema,
				response: {
					200: createSuccessResponseSchema(UserDetailSchema),
					...ITEM_ERRORS,
				},
			},
		},
		async (request, reply) => {
			const data = await fastify.di
				.resolve(UserService)
				.findOne(request.params.id);
			return ResponseToolkit.success(
				reply,
				data,
				t("settings.users.detailFetched"),
			);
		},
	);

	// ======================
	// PATCH: /settings/users/:id
	// ======================
	app.patch(
		"/:id",
		{
			onRequest: PermissionGuard(["user edit"]),
			schema: {
				tags: TAGS,
				summary: "Update user",
				description:
					"Full replace of name, email, status, remark and roles; the password is not changed here. Requires 'user edit' permission.",
				security: SECURITY,
				params: UserIdParamsSchema,
				body: UserUpdateSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(UserService)
				.update(request.params.id, request.body);
			return ResponseToolkit.success(reply, null, t("settings.users.updated"));
		},
	);

	// ======================
	// DELETE: /settings/users/:id
	// ======================
	app.delete(
		"/:id",
		{
			onRequest: PermissionGuard(["user delete"]),
			schema: {
				tags: TAGS,
				summary: "Delete user",
				description:
					"Soft delete; the user's sessions end immediately. Requires 'user delete' permission.",
				security: SECURITY,
				params: UserIdParamsSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di.resolve(UserService).delete(request.params.id);
			return ResponseToolkit.success(reply, null, t("settings.users.deleted"));
		},
	);

	// ======================
	// POST: /settings/users/:id/reset-password
	// ======================
	app.post(
		"/:id/reset-password",
		{
			onRequest: RoleGuard(["superuser"]),
			schema: {
				tags: TAGS,
				summary: "Set a user's password",
				description:
					"Set a new password for any user and end their sessions. Requires the superuser role.",
				security: SECURITY,
				params: UserIdParamsSchema,
				body: UserResetPasswordSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(UserService)
				.resetPassword(request.params.id, request.body.newPassword);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.users.passwordChanged"),
			);
		},
	);

	// ======================
	// POST: /settings/users/:id/send-verification-email
	// ======================
	app.post(
		"/:id/send-verification-email",
		{
			onRequest: PermissionGuard(["user create"]),
			schema: {
				tags: TAGS,
				summary: "Send verification email",
				description:
					"Issue a new verification link to the user. Requires 'user create' permission.",
				security: SECURITY,
				params: UserIdParamsSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(UserService)
				.sendVerificationEmail(request.params.id);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.users.verificationEmailSent"),
			);
		},
	);

	// ======================
	// POST: /settings/users/:id/send-reset-password-email
	// ======================
	app.post(
		"/:id/send-reset-password-email",
		{
			onRequest: PermissionGuard(["user create"]),
			schema: {
				tags: TAGS,
				summary: "Send reset password email",
				description:
					"Issue a new password reset link to the user. Requires 'user create' permission.",
				security: SECURITY,
				params: UserIdParamsSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(UserService)
				.sendResetPasswordEmail(request.params.id);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.users.resetPasswordEmailSent"),
			);
		},
	);
}
