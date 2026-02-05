import { HttpError } from "./http.error";

export class ConflictError extends HttpError {
	constructor(message: string = "Conflict") {
		super(409, message, "CONFLICT");
	}
}
