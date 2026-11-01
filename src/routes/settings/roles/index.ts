import { PermissionGuard } from "@fastify-libs";
import { t } from "@i18n";
import { RoleService } from "@services";
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
	RoleCreateSchema,
	RoleDetailSchema,
	RoleIdParamsSchema,
	RoleListSchema,
	RoleQuerySchema,
	RoleUpdateSchema,
} from "./schema";

const TAGS = ["Settings/Roles"];
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
	// GET: /settings/roles
	// ======================
	app.get(
		"",
		{
			onRequest: PermissionGuard(["role list"]),
			schema: {
				tags: TAGS,
				summary: "List roles",
				description: "Paginated roles. Requires 'role list' permission.",
				security: SECURITY,
				querystring: RoleQuerySchema,
				response: {
					200: createSuccessPaginationResponseSchema(RoleListSchema),
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
				.resolve(RoleService)
				.findAll(DatatableToolkit.parseFilter(request));
			return ResponseToolkit.success(reply, data, t("settings.roles.fetched"));
		},
	);

	// ======================
	// POST: /settings/roles
	// ======================
	app.post(
		"",
		{
			onRequest: PermissionGuard(["role create"]),
			schema: {
				tags: TAGS,
				summary: "Create role",
				description:
					"Create a role and grant it permissions. A duplicate name or unknown permission id is a 422. Requires 'role create' permission.",
				security: SECURITY,
				body: RoleCreateSchema,
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
			await fastify.di.resolve(RoleService).create(request.body);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.roles.created"),
				201,
			);
		},
	);

	// ======================
	// GET: /settings/roles/:id
	// ======================
	app.get(
		"/:id",
		{
			onRequest: PermissionGuard(["role detail"]),
			schema: {
				tags: TAGS,
				summary: "Get role",
				description:
					"Role detail with every permission grouped and marked isAssigned. Requires 'role detail' permission.",
				security: SECURITY,
				params: RoleIdParamsSchema,
				response: {
					200: createSuccessResponseSchema(RoleDetailSchema),
					...ITEM_ERRORS,
				},
			},
		},
		async (request, reply) => {
			const data = await fastify.di
				.resolve(RoleService)
				.findOne(request.params.id);
			return ResponseToolkit.success(
				reply,
				data,
				t("settings.roles.detailFetched"),
			);
		},
	);

	// ======================
	// PATCH: /settings/roles/:id
	// ======================
	app.patch(
		"/:id",
		{
			onRequest: PermissionGuard(["role edit"]),
			schema: {
				tags: TAGS,
				summary: "Update role",
				description:
					"Full replace of the name and granted permissions. Holders re-load their permissions on the next request. Requires 'role edit' permission.",
				security: SECURITY,
				params: RoleIdParamsSchema,
				body: RoleUpdateSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(RoleService)
				.update(request.params.id, request.body);
			return ResponseToolkit.success(reply, null, t("settings.roles.updated"));
		},
	);

	// ======================
	// DELETE: /settings/roles/:id
	// ======================
	app.delete(
		"/:id",
		{
			onRequest: PermissionGuard(["role delete"]),
			schema: {
				tags: TAGS,
				summary: "Delete role",
				description:
					"Hard delete; grants and assignments cascade. Requires 'role delete' permission.",
				security: SECURITY,
				params: RoleIdParamsSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di.resolve(RoleService).delete(request.params.id);
			return ResponseToolkit.success(reply, null, t("settings.roles.deleted"));
		},
	);
}
