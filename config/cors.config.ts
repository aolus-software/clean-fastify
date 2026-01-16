import { cleanEnv, str, num, bool } from "envalid";

const env = cleanEnv(process.env, {
	CORS_ORIGIN: str({ default: "*" }),
	CORS_METHODS: str({ default: "GET,HEAD,PUT,PATCH,POST,DELETE" }),
	CORS_ALLOWED_HEADERS: str({ default: "Content-Type,Authorization" }),
	CORS_EXPOSED_HEADERS: str({ default: "" }),
	CORS_MAX_AGE: num({ default: 86400 }),
	CORS_CREDENTIALS: bool({ default: false }),
});

type CorsConfigType = {
	origin: string;
	methods: string[];
	allowedHeaders: string[];
	exposedHeaders: string[];
	maxAge: number;
	credentials: boolean;
};

export const corsConfig: CorsConfigType = {
	origin: env.CORS_ORIGIN,
	methods: env.CORS_METHODS.split(",").map((method) => method.trim()),
	allowedHeaders: env.CORS_ALLOWED_HEADERS.split(",").map((header) =>
		header.trim(),
	),
	exposedHeaders: env.CORS_EXPOSED_HEADERS
		? env.CORS_EXPOSED_HEADERS.split(",").map((header) => header.trim())
		: [],
	maxAge: env.CORS_MAX_AGE,
	credentials: env.CORS_CREDENTIALS,
};
