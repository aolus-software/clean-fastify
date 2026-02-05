import { HttpError } from "./http.error";

export class BadRequestError extends HttpError {
	constructor(message: string = "Bad Request") {
		super(400, message, "BAD_REQUEST");
	}
}
