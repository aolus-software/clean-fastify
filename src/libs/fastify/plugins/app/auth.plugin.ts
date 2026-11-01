import { t } from "@i18n";
import { AccessTokenPayload, SessionService } from "@services";
import { UserInformation } from "@types";
import { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { container } from "tsyringe";

import { UnauthorizedError } from "../../error";

declare module "fastify" {
	interface FastifyRequest {
		authenticate(): Promise<void>;
		userInformation: UserInformation;
	}
}

/**
 * Verifies the bearer access token and loads the caller's UserInformation. Only `type: "access"`
 * tokens signed with JWT_SECRET pass; a refresh token fails both the signature and the type check.
 * A user who is missing, soft-deleted, or not active resolves to null and gets 401. Throws, so a
 * module-level `onRequest` hook calling it stops the request.
 */
async function authenticate(this: FastifyRequest): Promise<void> {
	let payload: Partial<AccessTokenPayload>;
	try {
		payload = await this.jwtVerify<Partial<AccessTokenPayload>>();
	} catch {
		throw new UnauthorizedError(t("auth.invalidToken"));
	}

	if (payload.type !== "access" || !payload.id) {
		throw new UnauthorizedError(t("auth.invalidToken"));
	}

	const user = await container
		.resolve(SessionService)
		.getUserInformation(payload.id);
	if (!user) {
		throw new UnauthorizedError(t("auth.userNotFound"));
	}

	this.userInformation = user;
}

export default fp(
	// eslint-disable-next-line @typescript-eslint/require-await
	async function (fastify) {
		fastify.decorateRequest("authenticate", authenticate);
	},
	{ name: "auth-plugin" },
);
