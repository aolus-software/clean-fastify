import { env } from "./env.config";

interface IDatabaseConfig {
	url: string;
	pool: {
		min: number;
		max: number;
		idleTimeoutMillis: number;
		connectionTimeoutMillis: number;
	};
	logQueries: boolean;
}

export const DatabaseConfig: IDatabaseConfig = {
	url: env.DATABASE_URL,
	pool: {
		min: env.DB_POOL_MIN,
		max: env.DB_POOL_MAX,
		idleTimeoutMillis: env.DB_IDLE_TIMEOUT,
		connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT,
	},
	logQueries: env.DB_LOG_QUERIES,
};
