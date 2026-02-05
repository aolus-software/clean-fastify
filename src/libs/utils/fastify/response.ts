import { FastifyReply } from "fastify";

export class ResponseToolkit {
	static success<T>(
		reply: FastifyReply,
		data: T | null,
		message: string = "Success",
		statusCode: number = 200,
	) {
		return reply.status(statusCode).send({
			status: statusCode,
			success: true,
			message,
			data,
		});
	}

	static error<T>(
		reply: FastifyReply,
		message: string,
		statusCode: number = 400,
		data?: T,
	) {
		return reply.status(statusCode).send({
			status: statusCode,
			success: false,
			message,
			data,
		});
	}

	static notFound(reply: FastifyReply, message: string = "Resource not found") {
		return this.error(reply, message, 404);
	}

	static unauthorized(reply: FastifyReply, message: string = "Unauthorized") {
		return this.error(reply, message, 401);
	}

	static response<T>(
		reply: FastifyReply,
		success: boolean,
		data: T | null,
		message: string = "Success",
		statusCode: number = 200,
	) {
		return reply.status(statusCode).send({
			status: statusCode,
			success,
			message,
			data,
		});
	}

	static validationError(
		reply: FastifyReply,
		errors: { [key: string]: string }[],
		message: string = "Validation failed",
		statusCode: number = 422,
	) {
		return reply.status(statusCode).send({
			status: statusCode,
			success: false,
			message,
			errors,
		});
	}
}

export class ResponseToolkitV2 {
	static success<T>(
		data: T | null,
		message: string = "Success",
		statusCode: number = 200,
	) {
		return {
			status: statusCode,
			success: true,
			message,
			data,
		};
	}

	static error(message: string, statusCode: number = 400) {
		return {
			status: statusCode,
			success: false,
			message,
		};
	}

	static notFound(message: string = "Resource not found") {
		return this.error(message, 404);
	}

	static unauthorized(message: string = "Unauthorized") {
		return this.error(message, 401);
	}

	static response<T>(
		success: boolean,
		data: T | null,
		message: string = "Success",
		statusCode: number = 200,
	) {
		return {
			status: statusCode,
			success,
			message,
			data,
		};
	}

	static validationError(
		errors: { [key: string]: string }[],
		message: string = "Validation failed",
		statusCode: number = 422,
	) {
		return {
			status: statusCode,
			success: false,
			message,
			errors,
		};
	}
}
