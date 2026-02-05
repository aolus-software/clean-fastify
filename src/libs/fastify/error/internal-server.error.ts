import { HttpError } from "./http.error";

export class InternalServerError extends HttpError {
	constructor(message: string = "Internal Server Error") {
		super(500, message, "INTERNAL_SERVER_ERROR");
	}
}
