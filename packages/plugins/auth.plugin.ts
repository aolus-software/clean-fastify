import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { ResponseToolkit } from "@toolkit/response";
import { UserInformationCacheKey } from "@cache/*";
import { UserRepository } from "apps/api/repositories/user.repository";

// eslint-disable-next-line @typescript-eslint/require-await
async function authPlugin(fastify: FastifyInstance) {
	fastify.decorate(
		"authenticate",
		async function (req: FastifyRequest, reply: FastifyReply) {
			try {
				await req.jwtVerify();
				const userJwt = req.user as { id: string };

				const cacheKey = UserInformationCacheKey(userJwt.id);
				const cacheUser = await this.redis.get(cacheKey);

				if (!cacheUser) {
					const userRepo = UserRepository();
					const userData = await userRepo.UserInformation(userJwt.id);

					await this.redis.set(
						cacheKey,
						JSON.stringify(userData),
						"EX",
						3600 * 24,
					);
					req.user = userData;
				} else {
					req.user = JSON.parse(cacheUser);
				}
			} catch {
				ResponseToolkit.unauthorized(reply, "Invalid or expired token");
				return;
			}
		},
	);

	fastify.decorate("clearUserCache", async function (userId: string) {
		const cacheKey = UserInformationCacheKey(userId);
		await this.redis.del(cacheKey);
	});
}

export default fastifyPlugin(authPlugin);
