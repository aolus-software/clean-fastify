import { HttpError } from "./http.error";

export class UnprocessableEntityError extends HttpError {
	constructor(
		message: string = "Validation error",
		public validationErrors?: Array<{ field: string; message: string }>,
	) {
		super(422, message, "UNPROCESSABLE_ENTITY");
	}
}
