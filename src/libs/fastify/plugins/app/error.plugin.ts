import {
	BadRequestError,
	HttpError,
	UnprocessableEntityError,
} from "@fastify-libs";
import { issueFieldName, t, translateValidationIssue } from "@i18n";
import { ResponseToolkit } from "@utils";
import { FastifyError } from "fastify";
import fp from "fastify-plugin";

interface ValidationIssueLike {
	instancePath?: string;
	schemaPath?: string;
	code?: string;
	expected?: string;
	received?: string;
	format?: string;
	validation?: string;
	type?: string;
	path?: (string | number)[];
	keyword?: string;
	message?: string;
	schema?: { format?: string; pattern?: string };
}

const fieldFromIssue = (err: ValidationIssueLike): string => {
	const instancePath =
		typeof err.instancePath === "string"
			? err.instancePath.replace(/^\//, "")
			: "";
	if (instancePath) return instancePath;
	if (Array.isArray(err.path) && err.path.length > 0) {
		return issueFieldName(err);
	}
	return "general";
};

const badRequestCodes = new Set<string>([
	"FST_ERR_CTP_INVALID_JSON_BODY",
	"FST_ERR_CTP_EMPTY_JSON_BODY",
	"FST_ERR_CTP_INVALID_CONTENT_LENGTH",
	"FST_ERR_CTP_INVALID_TYPE",
	"FST_ERR_CTP_EMPTY_TYPE",
	"FST_ERR_CTP_INVALID_PARSE_TYPE",
]);

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async function (fastify) {
	fastify.setNotFoundHandler(function (_request, reply) {
		ResponseToolkit.error(reply, t("errors.routeNotFound"), 404);
	});

	fastify.setErrorHandler(function (error: FastifyError, request, reply) {
		if (error instanceof UnprocessableEntityError) {
			ResponseToolkit.validationError(
				reply,
				error.validationErrors ?? [],
				error.message || t("validation.failed"),
			);
			return;
		}

		if (error instanceof BadRequestError && error.validationErrors) {
			ResponseToolkit.validationError(
				reply,
				error.validationErrors,
				error.message || t("errors.badRequest"),
				400,
			);
			return;
		}

		if (error.validation) {
			const errors = error.validation.map((err) => {
				const issue = err as ValidationIssueLike;
				const { key, vars } = translateValidationIssue(issue);
				return { field: fieldFromIssue(issue), message: t(key, vars) };
			});
			ResponseToolkit.validationError(reply, errors, t("validation.failed"));
			return;
		}

		if (error instanceof HttpError) {
			ResponseToolkit.error(reply, error.message, error._statusCode);
			return;
		}

		if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
			ResponseToolkit.error(reply, t("errors.payloadTooLarge"), 413);
			return;
		}

		if (error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
			ResponseToolkit.error(reply, t("errors.unsupportedMediaType"), 415);
			return;
		}

		if (badRequestCodes.has(error.code) || error instanceof SyntaxError) {
			ResponseToolkit.validationError(
				reply,
				[{ field: "body", message: t("errors.parseBody") }],
				t("errors.parseFailed"),
				400,
			);
			return;
		}

		if (error.statusCode === 429) {
			reply.status(429).send({
				status: 429,
				success: false,
				message: t("errors.tooManyRequests"),
			});
			return;
		}

		if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
			ResponseToolkit.error(reply, t("errors.badRequest"), error.statusCode);
			return;
		}

		request.log.error(
			{ error: error.message, stack: error.stack, name: error.name },
			"Unhandled error",
		);
		ResponseToolkit.error(reply, t("errors.internal"), 500);
	});
});
