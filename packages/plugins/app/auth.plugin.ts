import { UserInformationCacheKey } from "@packages/cache";
import { UserRepository } from "@postgres/repositories";
import { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { UserInformation } from "packages/types/UserInformation";

declare module "fastify" {
	interface FastifyInstance {
		userInformation: UserInformation;
	}

	interface FastifyRequest {
		authenticate(_reply: FastifyReply): Promise<void>;
		userInformation: UserInformation;
	}
}

// Authenticate user and load user information into request
async function authenticate(this: FastifyRequest, reply: FastifyReply) {
	try {
		await this.jwtVerify();
		const userJwt = this.user as { id: string };
		const cacheKey = UserInformationCacheKey(userJwt.id);
		const cacheUser = await this.server.redis.get(cacheKey);
		if (!cacheUser) {
			const userRepo = new UserRepository().UserInformation(userJwt.id);
			const userData = await userRepo;
			await this.server.redis.set(
				cacheKey,
				JSON.stringify(userData),
				"EX",
				3600 * 24,
			);
			this.userInformation = userData;
		} else {
			this.userInformation = JSON.parse(cacheUser);
		}
	} catch {
		reply.status(401).send({ message: "Unauthorized" });
		return;
	}

	return;
}

export default fp(
	// eslint-disable-next-line @typescript-eslint/require-await
	async function (fastify) {
		fastify.decorateRequest("authenticate", authenticate);
	},
	{ name: "auth-plugin" },
);
