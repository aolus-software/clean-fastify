import { PermissionService } from "@services";
import {
	BadRequestResponseSchema,
	buildDatatableQueryParamsSchema,
	createSuccessPaginationResponseSchema,
	createSuccessResponseSchema,
	DatatableToolkit,
	ForbiddenResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	CreatePermissionSchema,
	PermissionSchema,
	UpdatePermissionSchema,
} from "./schema";

export default function (fastify: FastifyInstance) {
	// Apply authentication to all routes in this module using autohook
	fastify.addHook("onRequest", async (request, reply) => {
		await request.authenticate(reply);
	});

	// ======================
	// GET: /settings/permission
	// ======================
	fastify.get(
		"",
		{
			schema: {
				tags: ["Settings/Permission"],
				description:
					"Get authenticated user's permission settings. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				querystring: buildDatatableQueryParamsSchema(
					["id", "name", "group", "created_at", "updated_at"],
					["name", "group", "created_at", "updated_at"],
				),
				response: {
					200: createSuccessPaginationResponseSchema(PermissionSchema),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			request.requireSuperuser(reply);

			const queryParams = DatatableToolkit.parseFilter(request);
			const service = fastify.di.resolve(PermissionService);
			const data = await service.findAll(queryParams);
			return ResponseToolkit.success(reply, data, "Permissions fetched", 200);
		},
	);

	// ======================
	// POST: /settings/permission
	// ======================
	fastify.post(
		"",
		{
			schema: {
				tags: ["Settings/Permission"],
				description: "Create a new permission. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				body: CreatePermissionSchema,
				response: {
					201: createSuccessResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			request.requireSuperuser(reply);

			const { name, group } = request.body as {
				name: string[];
				group: string;
			};

			const service = fastify.di.resolve(PermissionService);
			await service.create({ name: name, group });
			return ResponseToolkit.success(reply, {}, "Permission created", 201);
		},
	);

	// ======================
	// GET: /settings/permission/:permissionId
	// ======================
	fastify.get(
		"/:permissionId",
		{
			schema: {
				tags: ["Settings/Permission"],
				description: "Get permission detail by ID. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					permissionId: z.string().describe("Permission ID"),
				}),
				response: {
					200: createSuccessResponseSchema(PermissionSchema),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			request.requireSuperuser(reply);
			const { permissionId } = request.params as { permissionId: string };

			const service = fastify.di.resolve(PermissionService);
			const data = await service.detail(permissionId);
			return ResponseToolkit.success(
				reply,
				data,
				"Permission detail fetched",
				200,
			);
		},
	);

	// ======================
	// PUT: /settings/permission/:permissionId
	// ======================
	fastify.put(
		"/:permissionId",
		{
			schema: {
				tags: ["Settings/Permission"],
				description: "Update permission by ID. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					permissionId: z.string().describe("Permission ID"),
				}),
				body: UpdatePermissionSchema,
				response: {
					200: createSuccessResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			request.requireSuperuser(reply);
			const { permissionId } = request.params as { permissionId: string };
			const { name, group } = request.body as {
				name: string;
				group: string;
			};

			const service = fastify.di.resolve(PermissionService);
			await service.update(permissionId, { name, group });
			return ResponseToolkit.success(reply, {}, "Permission updated", 200);
		},
	);

	// ======================
	// DELETE: /settings/permission/:permissionId
	// ======================
	fastify.delete(
		"/:permissionId",
		{
			schema: {
				tags: ["Settings/Permission"],
				description: "Delete permission by ID. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					permissionId: z.string().describe("Permission ID"),
				}),
				response: {
					200: createSuccessResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			request.requireSuperuser(reply);
			const { permissionId } = request.params as { permissionId: string };

			const service = fastify.di.resolve(PermissionService);
			await service.delete(permissionId);
			return ResponseToolkit.success(reply, {}, "Permission deleted", 200);
		},
	);
}
