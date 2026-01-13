import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { container } from "@packages/di";

declare module "fastify" {
	interface FastifyInstance {
		di: typeof container;
	}
}

export default fp(
	// eslint-disable-next-line @typescript-eslint/require-await
	async function (fastify: FastifyInstance) {
		fastify.decorate("di", container);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		fastify.decorate("resolve", <T>(token: any): T => {
			return container.resolve<T>(token);
		});
	},
	{ name: "di-plugin" },
);
