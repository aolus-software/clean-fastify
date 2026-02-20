import { RoleService } from "@services";
import {
	BadRequestResponseSchema,
	buildDatatableQueryParamsSchema,
	createSuccessPaginationResponseSchema,
	createSuccessResponseSchema,
	DatatableToolkit,
	ForbiddenResponseSchema,
	NotFoundResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import {
	CreateRoleSchema,
	RoleDetailResponseSchema,
	RoleResponseSchema,
	UpdateRoleSchema,
} from "./schema";

export default function (fastify: FastifyInstance) {
	fastify.addHook("onRequest", async (request, reply) => {
		await request.authenticate(reply);
	});

	// ======================
	// GET: /settings/role
	// ======================
	fastify.get(
		"",
		{
			schema: {
				tags: ["Settings/Role"],
				description: "Get authenticated user's role settings.",
				security: [{ BearerAuth: [] }],
				querystring: buildDatatableQueryParamsSchema(
					["id", "name", "created_at", "updated_at"],
					["name", "created_at", "updated_at"],
				),
				response: {
					200: createSuccessPaginationResponseSchema(RoleResponseSchema),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const queryParams = DatatableToolkit.parseFilter(request);
			const service = fastify.di.resolve(RoleService);
			const data = await service.findAll(queryParams);

			return ResponseToolkit.success(reply, data, "Roles fetched", 200);
		},
	);

	// ======================
	// POST: /settings/role
	// ======================
	fastify.post(
		"",
		{
			schema: {
				tags: ["Settings/Role"],
				description: "Create a new role. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				body: CreateRoleSchema,
				response: {
					201: createSuccessResponseSchema(z.object({}), 201),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const service = fastify.di.resolve(RoleService);
			const body = request.body as z.infer<typeof CreateRoleSchema>;
			await service.create(body);

			return ResponseToolkit.success(reply, {}, "Role created", 201);
		},
	);

	// ======================
	// GET: /settings/role/:roleId
	// ======================
	fastify.get(
		"/:roleId",
		{
			schema: {
				tags: ["Settings/Role"],
				description: "Get role detail by ID.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					roleId: z.uuid(),
				}),
				response: {
					200: createSuccessResponseSchema(RoleDetailResponseSchema),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { roleId } = request.params as { roleId: string };
			const service = fastify.di.resolve(RoleService);
			const data = await service.detail(roleId);

			return ResponseToolkit.success(reply, data, "Role detail fetched", 200);
		},
	);

	// ======================
	// PUT: /settings/role/:roleId
	// ======================
	fastify.put(
		"/:roleId",
		{
			schema: {
				tags: ["Settings/Role"],
				description: "Update role by ID. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					roleId: z.uuid(),
				}),
				body: UpdateRoleSchema,
				response: {
					200: createSuccessResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { roleId } = request.params as { roleId: string };
			const body = request.body as z.infer<typeof CreateRoleSchema>;
			const service = fastify.di.resolve(RoleService);
			await service.update(roleId, body);

			return ResponseToolkit.success(reply, {}, "Role updated", 200);
		},
	);

	// ======================
	// DELETE: /settings/role/:roleId
	// ======================
	fastify.delete(
		"/:roleId",
		{
			schema: {
				tags: ["Settings/Role"],
				description: "Delete role by ID. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					roleId: z.uuid(),
				}),
				response: {
					200: createSuccessResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { roleId } = request.params as { roleId: string };
			const service = fastify.di.resolve(RoleService);
			await service.delete(roleId);

			return ResponseToolkit.success(reply, {}, "Role deleted", 200);
		},
	);
}
