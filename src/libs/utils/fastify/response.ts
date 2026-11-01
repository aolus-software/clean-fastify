import { FastifyReply } from "fastify";

export type FieldError = { field: string; message: string };

export class ResponseToolkit {
	static success<T>(
		reply: FastifyReply,
		data: T | null,
		message: string = "Success",
		statusCode: number = 200,
	): FastifyReply {
		return reply.status(statusCode).send({
			status: statusCode,
			success: true,
			message,
			data,
		});
	}

	static error(
		reply: FastifyReply,
		message: string,
		statusCode: number = 400,
	): FastifyReply {
		return reply.status(statusCode).send({
			status: statusCode,
			success: false,
			message,
			data: null,
		});
	}

	static validationError(
		reply: FastifyReply,
		errors: FieldError[],
		message: string = "Validation failed",
		statusCode: number = 422,
	): FastifyReply {
		return reply.status(statusCode).send({
			status: statusCode,
			success: false,
			message,
			errors,
		});
	}
}
