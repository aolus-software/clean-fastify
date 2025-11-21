export class HttpError extends Error {
	constructor(
		// eslint-disable-next-line no-unused-vars
		public statusCode: number,
		message: string,
		// eslint-disable-next-line no-unused-vars
		public code?: string,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class BadRequestError extends HttpError {
	constructor(message: string = "Bad Request") {
		super(400, message, "BAD_REQUEST");
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message: string = "Unauthorized") {
		super(401, message, "UNAUTHORIZED");
	}
}

export class ForbiddenError extends HttpError {
	constructor(message: string = "Forbidden") {
		super(403, message, "FORBIDDEN");
	}
}

export class NotFoundError extends HttpError {
	constructor(message: string = "Not Found") {
		super(404, message, "NOT_FOUND");
	}
}

export class UnprocessableEntityError extends HttpError {
	constructor(
		message: string = "Validation error",
		// eslint-disable-next-line no-unused-vars
		public validationErrors?: Array<{ field: string; message: string }>,
	) {
		super(422, message, "UNPROCESSABLE_ENTITY");
	}
}

export class InternalServerError extends HttpError {
	constructor(message: string = "Internal Server Error") {
		super(500, message, "INTERNAL_SERVER_ERROR");
	}
}

export class ConflictError extends HttpError {
	constructor(message: string = "Conflict") {
		super(409, message, "CONFLICT");
	}
}
