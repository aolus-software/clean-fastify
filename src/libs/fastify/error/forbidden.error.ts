import { HttpError } from "./http.error";

export class ForbiddenError extends HttpError {
	constructor(message: string = "Forbidden") {
		super(403, message, "FORBIDDEN");
	}
}
