import { enterLocale, Locale, parseAcceptLanguage } from "@i18n";
import fp from "fastify-plugin";

declare module "fastify" {
	interface FastifyRequest {
		locale: Locale;
	}
}

export default fp(
	// eslint-disable-next-line @typescript-eslint/require-await
	async function (fastify) {
		fastify.decorateRequest("locale", "en");

		fastify.addHook("onRequest", (request, _reply, done) => {
			const locale = parseAcceptLanguage(request.headers["accept-language"]);
			request.locale = locale;
			enterLocale(locale);
			done();
		});

		fastify.addHook("onSend", (request, reply, payload, done) => {
			reply.header("Content-Language", request.locale);
			done(null, payload);
		});
	},
	{ name: "i18n-plugin" },
);
