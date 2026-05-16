import { t } from "@i18n";
import { ResponseToolkit } from "@utils";
import { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
	interface FastifyRequest {
		requireSuperuser(reply: FastifyReply): void;
	}
}

function requireSuperuser(this: FastifyRequest, reply: FastifyReply) {
	const userInformation = this.userInformation;
	if (!userInformation) {
		ResponseToolkit.unauthorized(reply, t("auth.authRequired"));
		return;
	}

	if (!userInformation.roles.some((role) => role === "superuser")) {
		ResponseToolkit.error(reply, t("auth.accessDeniedSuperuser"), 403);
		return;
	}
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async function (fastify) {
	fastify.decorateRequest("requireSuperuser", requireSuperuser);
});
