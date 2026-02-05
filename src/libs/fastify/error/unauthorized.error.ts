import { HttpError } from "./http.error";

export class UnauthorizedError extends HttpError {
	constructor(message: string = "Unauthorized") {
		super(401, message, "UNAUTHORIZED");
	}
}
