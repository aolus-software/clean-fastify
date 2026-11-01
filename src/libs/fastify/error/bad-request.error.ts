import { HttpError } from "./http.error";

export class BadRequestError extends HttpError {
	constructor(
		message: string = "Bad Request",
		public validationErrors?: Array<{ field: string; message: string }>,
	) {
		super(400, message, "BAD_REQUEST");
	}
}
