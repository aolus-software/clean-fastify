import { PermissionGuard } from "@fastify-libs";
import { t } from "@i18n";
import { PermissionService } from "@services";
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
	PermissionCreateSchema,
	PermissionIdParamsSchema,
	PermissionListSchema,
	PermissionQuerySchema,
	PermissionUpdateSchema,
} from "./schema";

const TAGS = ["Settings/Permissions"];
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
	// GET: /settings/permissions
	// ======================
	app.get(
		"",
		{
			onRequest: PermissionGuard(["permission list"]),
			schema: {
				tags: TAGS,
				summary: "List permissions",
				description:
					"Paginated permissions. Requires 'permission list' permission.",
				security: SECURITY,
				querystring: PermissionQuerySchema,
				response: {
					200: createSuccessPaginationResponseSchema(PermissionListSchema),
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
				.resolve(PermissionService)
				.findAll(DatatableToolkit.parseFilter(request));
			return ResponseToolkit.success(
				reply,
				data,
				t("settings.permissions.fetched"),
			);
		},
	);

	// ======================
	// POST: /settings/permissions
	// ======================
	app.post(
		"",
		{
			onRequest: PermissionGuard(["permission create"]),
			schema: {
				tags: TAGS,
				summary: "Create permissions",
				description:
					"Create one permission per action in name, each stored as '<group> <action>'. Any name that already exists is a 422. Requires 'permission create' permission.",
				security: SECURITY,
				body: PermissionCreateSchema,
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
			await fastify.di.resolve(PermissionService).create(request.body);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.permissions.created"),
				201,
			);
		},
	);

	// ======================
	// GET: /settings/permissions/:id
	// ======================
	app.get(
		"/:id",
		{
			onRequest: PermissionGuard(["permission detail"]),
			schema: {
				tags: TAGS,
				summary: "Get permission",
				description:
					"Permission detail. Requires 'permission detail' permission.",
				security: SECURITY,
				params: PermissionIdParamsSchema,
				response: {
					200: createSuccessResponseSchema(PermissionListSchema),
					...ITEM_ERRORS,
				},
			},
		},
		async (request, reply) => {
			const data = await fastify.di
				.resolve(PermissionService)
				.findOne(request.params.id);
			return ResponseToolkit.success(
				reply,
				data,
				t("settings.permissions.detailFetched"),
			);
		},
	);

	// ======================
	// PATCH: /settings/permissions/:id
	// ======================
	app.patch(
		"/:id",
		{
			onRequest: PermissionGuard(["permission edit"]),
			schema: {
				tags: TAGS,
				summary: "Update permission",
				description:
					"name is stored verbatim, so send the full '<group> <action>' string. A name held by another permission is a 422. Requires 'permission edit' permission.",
				security: SECURITY,
				params: PermissionIdParamsSchema,
				body: PermissionUpdateSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(PermissionService)
				.update(request.params.id, request.body);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.permissions.updated"),
			);
		},
	);

	// ======================
	// DELETE: /settings/permissions/:id
	// ======================
	app.delete(
		"/:id",
		{
			onRequest: PermissionGuard(["permission delete"]),
			schema: {
				tags: TAGS,
				summary: "Delete permission",
				description:
					"Hard delete; role grants cascade. Requires 'permission delete' permission.",
				security: SECURITY,
				params: PermissionIdParamsSchema,
				response: { 200: NullSuccessResponseSchema, ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			await fastify.di.resolve(PermissionService).delete(request.params.id);
			return ResponseToolkit.success(
				reply,
				null,
				t("settings.permissions.deleted"),
			);
		},
	);
}
