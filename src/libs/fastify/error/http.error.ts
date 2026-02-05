export class HttpError extends Error {
	constructor(
		public _statusCode: number,
		_message: string,
		public _code?: string,
	) {
		super(_message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}
