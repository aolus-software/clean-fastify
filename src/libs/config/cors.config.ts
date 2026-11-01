import { env } from "./env.config";

type CorsConfigType = {
	origin: string | string[];
	methods: string[];
	allowedHeaders: string[];
	credentials: boolean;
	maxAge: number;
};

export const corsConfig: CorsConfigType = {
	origin: env.ALLOWED_HOST
		? env.ALLOWED_HOST.split(",").map((origin) => origin.trim())
		: "*",
	methods: ["GET", "POST", "PATCH", "DELETE"],
	allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
	credentials: false,
	maxAge: 86400,
};
