import { RoleGuard } from "@fastify-libs";
import { t } from "@i18n";
import { SelectOptionService } from "@services";
import {
	createSuccessResponseSchema,
	ForbiddenResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { SelectPermissionSchema, SelectRoleSchema } from "./schema";

const TAGS = ["Settings/Select Options"];
const SECURITY = [{ BearerAuth: [] }];

export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.addHook("onRequest", async (request) => {
		await request.authenticate();
	});

	// ======================
	// GET: /settings/select-options/permissions
	// ======================
	app.get(
		"/permissions",
		{
			onRequest: RoleGuard(["superuser"]),
			schema: {
				tags: TAGS,
				summary: "Permission options",
				description:
					"Every permission grouped by group, for a role form. Requires the superuser role.",
				security: SECURITY,
				response: {
					200: createSuccessResponseSchema(SelectPermissionSchema),
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (_request, reply) => {
			const data = await fastify.di.resolve(SelectOptionService).permissions();
			return ResponseToolkit.success(
				reply,
				data,
				t("settings.select.permissionsFetched"),
			);
		},
	);

	// ======================
	// GET: /settings/select-options/roles
	// ======================
	app.get(
		"/roles",
		{
			onRequest: RoleGuard(["superuser"]),
			schema: {
				tags: TAGS,
				summary: "Role options",
				description:
					"Every role except superuser, ordered by name, for a user form. Requires the superuser role.",
				security: SECURITY,
				response: {
					200: createSuccessResponseSchema(SelectRoleSchema),
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (_request, reply) => {
			const data = await fastify.di.resolve(SelectOptionService).roles();
			return ResponseToolkit.success(
				reply,
				data,
				t("settings.select.rolesFetched"),
			);
		},
	);
}
