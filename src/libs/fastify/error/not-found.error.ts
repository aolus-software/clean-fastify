import { HttpError } from "./http.error";

export class NotFoundError extends HttpError {
	constructor(message: string = "Not Found") {
		super(404, message, "NOT_FOUND");
	}
}
