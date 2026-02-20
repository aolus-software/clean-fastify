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
	permissions: string[],
	reply: FastifyReply,
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

export default fp(
	// eslint-disable-next-line @typescript-eslint/require-await
	async function (fastify) {
		fastify.decorateRequest("requireRoles", requireRoles);
		fastify.decorateRequest("requirePermissions", requirePermissions);
	},
	{ name: "authorization-plugin" },
);
