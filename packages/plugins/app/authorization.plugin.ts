declare module "fastify" {
	interface FastifyInstance {
		requireRoles(_roles: string[]): Promise<void>;
		requiredPermissions(_permissions: string[]): Promise<void>;
	}
}

import { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

function requireRoles(
	this: FastifyRequest,
	reply: FastifyReply,
	roles: string[],
) {
	const userInformation = this.userInformation;
	if (!userInformation) {
		reply.status(401).send({ message: "Unauthorized" });
		return;
	}

	if (userInformation.roles.some((role) => role === "superuser")) {
		return;
	}

	const hasRequiredRole = roles.some((role) =>
		userInformation.roles.includes(role),
	);
	if (!hasRequiredRole) {
		reply
			.status(403)
			.send({ message: "Access denied. Required role(s) missing." });
		return;
	}
}

function requirePermissions(
	this: FastifyRequest,
	reply: FastifyReply,
	permissions: string[],
) {
	const userInformation = this.userInformation;
	if (!userInformation) {
		reply.status(401).send({ message: "Unauthorized" });
		return;
	}

	if (userInformation.roles.some((role) => role === "superuser")) {
		return;
	}

	const hasRequiredPermission = permissions.some((permission) =>
		userInformation.permissions.map((perm) => perm.name).includes(permission),
	);
	if (!hasRequiredPermission) {
		reply
			.status(403)
			.send({ message: "Access denied. Required permission(s) missing." });
		return;
	}
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async function (fastify) {
	fastify.decorateRequest("requireRoles", requireRoles);
	fastify.decorateRequest("requirePermissions", requirePermissions);
});
