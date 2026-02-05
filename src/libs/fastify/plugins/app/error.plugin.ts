import { ResponseToolkit } from "@utils";
import fp from "fastify-plugin";
import Fastify, { FastifyError } from "fastify";
import { HttpError, UnprocessableEntityError } from "@fastify-libs";

interface ValidationError {
	instancePath: string;
	schemaPath?: string;
	message?: string;
}

interface ErrorWithStatusCode {
	statusCode?: number;
	message: string;
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async function (fastify) {
	fastify.setErrorHandler(function (error: FastifyError, request, reply) {
		// Custom HTTP errors
		if (error instanceof UnprocessableEntityError) {
			ResponseToolkit.validationError(reply, error.validationErrors || []);
			return;
		}

		if (error.validation) {
			const errors = error.validation.map((err: ValidationError) => ({
				[err.instancePath.replace(/^\//, "") || err.schemaPath || "body"]:
					err.message || "Invalid value",
			}));

			ResponseToolkit.validationError(reply, errors);
			return;
		}

		if (error instanceof HttpError) {
			ResponseToolkit.error(reply, error.message, error._statusCode);
			return;
		}

		// fastify validation error
		if (error instanceof Fastify.errorCodes.FST_ERR_NOT_FOUND) {
			ResponseToolkit.notFound(reply, error.message);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_BAD_STATUS_CODE) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_VALIDATION) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_TYPE) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_EMPTY_TYPE) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_HANDLER) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_PARSE_TYPE) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_MEDIA_TYPE) {
			ResponseToolkit.error(reply, error.message, 415);
			return;
		}

		if (
			error instanceof Fastify.errorCodes.FST_ERR_CTP_INVALID_CONTENT_LENGTH
		) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_EMPTY_JSON_BODY) {
			ResponseToolkit.error(reply, "JSON Parse error: " + error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_REP_INVALID_PAYLOAD_TYPE) {
			ResponseToolkit.error(reply, error.message, 400);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_CTP_BODY_TOO_LARGE) {
			ResponseToolkit.error(reply, error.message, 413);
			return;
		}

		if (
			error instanceof Fastify.errorCodes.FST_ERR_FAILED_ERROR_SERIALIZATION
		) {
			ResponseToolkit.error(reply, error.message, 500);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_SEND_UNDEFINED_ERR) {
			ResponseToolkit.error(reply, error.message, 500);
			return;
		}

		if (error instanceof Fastify.errorCodes.FST_ERR_REP_ALREADY_SENT) {
			ResponseToolkit.error(reply, error.message, 500);
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

		ResponseToolkit.error(reply, "Internal Server Error", 500);
	});
});
