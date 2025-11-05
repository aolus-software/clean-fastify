type CorsConfigType = {
	origin: string;
	methods: string[];
	allowedHeaders: string[];
	exposedHeaders: string[];
	maxAge: number;
	credentials: boolean;
};

export const corsConfig: CorsConfigType = {
	origin: process.env.CORS_ORIGIN || "*",
	methods: process.env.CORS_METHODS
		? process.env.CORS_METHODS.split(",").map((method) => method.trim())
		: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
	allowedHeaders: process.env.CORS_ALLOWED_HEADERS
		? process.env.CORS_ALLOWED_HEADERS.split(",").map((header) => header.trim())
		: ["Content-Type", "Authorization"],
	exposedHeaders: process.env.CORS_EXPOSED_HEADERS
		? process.env.CORS_EXPOSED_HEADERS.split(",").map((header) => header.trim())
		: [],
	maxAge: process.env.CORS_MAX_AGE
		? parseInt(process.env.CORS_MAX_AGE, 10)
		: 86400, // Default to 24 hours
	credentials: process.env.CORS_CREDENTIALS === "true",
};
