import { PermissionRepository, RoleRepository } from "@database";
import {
	createSuccessResponseSchema,
	ForbiddenResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import {
	SelectPermissionResponseSchema,
	SelectRoleResponseSchema,
} from "./schema";
export default function (fastify: FastifyInstance) {
	// apply authentication to all routes in this module using autohook
	fastify.addHook("onRequest", async (request, reply) => {
		await request.authenticate(reply);
	});

	// ======================
	// GET: /settings/select/permissions
	// ======================
	fastify.get(
		"/permissions",
		{
			schema: {
				tags: ["Settings/Select"],
				description:
					"Get list of permissions for select inputs. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				response: {
					200: createSuccessResponseSchema(SelectPermissionResponseSchema),
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			request.requireSuperuser(reply);

			const repository = fastify.di.resolve(PermissionRepository);
			const permissions = await repository.selectOptions();

			return ResponseToolkit.success(
				reply,
				permissions,
				"Permission select options fetched",
				200,
			);
		},
	);

	// ======================
	// GET: /settings/select/roles
	// ======================
	fastify.get(
		"/roles",
		{
			schema: {
				tags: ["Settings/Select"],
				description:
					"Get list of roles for select inputs. Requires superuser role.",
				security: [{ BearerAuth: [] }],
				response: {
					200: createSuccessResponseSchema(SelectRoleResponseSchema),
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			request.requireSuperuser(reply);
			const repository = fastify.di.resolve(RoleRepository);
			const roles = await repository.selectOptions();

			return ResponseToolkit.success(
				reply,
				roles,
				"Role select options fetched",
				200,
			);
		},
	);
}
