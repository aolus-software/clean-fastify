import { HttpError, UnprocessableEntityError } from "@fastify-libs";
import { issueFieldName, t, translateValidationIssue } from "@i18n";
import { ResponseToolkit } from "@utils";
import Fastify, { FastifyError } from "fastify";
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

interface ErrorWithStatusCode {
	statusCode?: number;
	message: string;
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
	if (typeof err.schemaPath === "string" && err.schemaPath) {
		return err.schemaPath;
	}
	return "body";
};

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async function (fastify) {
	fastify.setErrorHandler(function (error: FastifyError, request, reply) {
		// Custom HTTP errors
		if (error instanceof UnprocessableEntityError) {
			ResponseToolkit.validationError(
				reply,
				error.validationErrors || [],
				error.message || t("validation.failed"),
			);
			return;
		}

		if (error.validation) {
			const errors = error.validation.map((err) => {
				const issue = err as ValidationIssueLike;
				const field = fieldFromIssue(issue);
				const { key, vars } = translateValidationIssue(issue);
				return { field, message: t(key, vars) };
			});

			ResponseToolkit.validationError(reply, errors, t("validation.failed"));
			return;
		}

		if (error instanceof HttpError) {
			ResponseToolkit.error(reply, error.message, error._statusCode);
			return;
		}

		// fastify validation error
		if (error instanceof Fastify.errorCodes.FST_ERR_NOT_FOUND) {
			ResponseToolkit.notFound(reply, t("errors.routeNotFound"));
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_BAD_STATUS_CODE) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_VALIDATION) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_TYPE) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_EMPTY_TYPE) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_HANDLER) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_PARSE_TYPE) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_MEDIA_TYPE) {
			ResponseToolkit.error(reply, t("errors.unsupportedMediaType"), 415);
			return;
		}

		if (
			error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_CONTENT_LENGTH
		) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_EMPTY_JSON_BODY) {
			ResponseToolkit.error(reply, t("errors.parseBody"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_REP_INVALID_PAYLOAD_TYPE) {
			ResponseToolkit.error(reply, t("errors.badRequest"), 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_BODY_TOO_LARGE) {
			ResponseToolkit.error(reply, t("errors.payloadTooLarge"), 413);
			return;
		}

		if (
			error instanceof Fastify.errorCodes.FST_ERR_FAILED_ERROR_SERIALIZATION
		) {
			ResponseToolkit.error(reply, t("errors.internal"), 500);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_SEND_UNDEFINED_ERR) {
			ResponseToolkit.error(reply, t("errors.internal"), 500);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_REP_ALREADY_SENT) {
			ResponseToolkit.error(reply, t("errors.internal"), 500);
			return;
		}

		if (
			(error as ErrorWithStatusCode).statusCode &&
			(error as ErrorWithStatusCode).statusCode! >= 400 &&
			(error as ErrorWithStatusCode).statusCode! < 500
		) {
			ResponseToolkit.error(reply, error.message, error.statusCode ?? 400);
			return;
		}

		request.log.error({
			message: "APP Error",
			error: error.message,
			stack: error.stack,
			name: error.name || "undefined",
		});

		ResponseToolkit.error(reply, t("errors.internal"), 500);
	});
});
