import { Context } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";

export class ResponseToolkit {
	static success<T>(
		ctx: Context,
		data: T | null,
		message: string = "Success",
		statusCode: ContentfulStatusCode,
	) {
		return ctx.json(
			{
				status: statusCode,
				success: true,
				message,
				data,
			},
			{ status: statusCode },
		);
	}

	static error(
		ctx: Context,
		message: string,
		statusCode: ContentfulStatusCode = 400,
	) {
		return ctx.json(
			{
				status: statusCode,
				success: false,
				message,
			},
			{ status: statusCode },
		);
	}

	static notFound(ctx: Context, message: string = "Resource not found") {
		return this.error(ctx, message, 404);
	}

	static unauthorized(ctx: Context, message: string = "Unauthorized") {
		return this.error(ctx, message, 401);
	}

	static response<T>(
		ctx: Context,
		success: boolean,
		data: T | null,
		message: string = "Success",
		statusCode: ContentfulStatusCode = 200,
	) {
		return ctx.json(
			{
				status: statusCode,
				success,
				message,
				data,
			},
			{ status: statusCode },
		);
	}

	static validationError(
		ctx: Context,
		errors: { [key: string]: string }[],
		message: string = "Validation failed",
		statusCode: ContentfulStatusCode = 422,
	) {
		return ctx.json(
			{
				status: statusCode,
				success: false,
				message,
				errors,
			},
			{ status: statusCode },
		);
	}
}
