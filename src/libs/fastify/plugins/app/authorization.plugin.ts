import { t } from "@i18n";
import { ResponseToolkit } from "@utils";
import { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
	interface FastifyRequest {
		requireRoles(roles: string[], reply: FastifyReply): void;
		requirePermissions(permissions: string[], reply: FastifyReply): void;
	}
}

function requireRoles(
	this: FastifyRequest,
	roles: string[],
	reply: FastifyReply,
) {
	const userInformation = this.userInformation;
	if (!userInformation) {
		ResponseToolkit.unauthorized(reply, t("auth.authRequired"));
		return;
	}

	if (userInformation.roles.some((role) => role === "superuser")) {
		return;
	}

	const hasRequiredRole = roles.some((role) =>
		userInformation.roles.includes(role),
	);
	if (!hasRequiredRole) {
		ResponseToolkit.error(reply, t("auth.accessDeniedRole"), 403);
		return;
	}
}

function requirePermissions(
	this: FastifyRequest,
	permissions: string[],
	reply: FastifyReply,
) {
	const userInformation = this.userInformation;
	if (!userInformation) {
		ResponseToolkit.unauthorized(reply, t("auth.authRequired"));
		return;
	}

	if (userInformation.roles.some((role) => role === "superuser")) {
		return;
	}

	const hasRequiredPermission = permissions.some((permission) =>
		userInformation.permissions.map((perm) => perm.name).includes(permission),
	);
	if (!hasRequiredPermission) {
		ResponseToolkit.error(reply, t("auth.accessDeniedPermission"), 403);
		return;
	}
}

export default fp(
	// eslint-disable-next-line @typescript-eslint/require-await
	async function (fastify) {
		fastify.decorateRequest("requireRoles", requireRoles);
		fastify.decorateRequest("requirePermissions", requirePermissions);
	},
	{ name: "authorization-plugin" },
);
