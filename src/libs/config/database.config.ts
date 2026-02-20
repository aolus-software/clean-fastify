import { cleanEnv, num, str } from "envalid";

const env = cleanEnv(process.env, {
	DATABASE_URL: str({
		default: "postgres://user:password@localhost:5432/mydb",
	}),
	DB_POOL_MIN: num({ default: 2 }),
	DB_POOL_MAX: num({ default: 10 }),
	DB_IDLE_TIMEOUT: num({ default: 30000 }),
	DB_CONNECTION_TIMEOUT: num({ default: 5000 }),
});

interface IDatabaseConfig {
	url: string;
	pool: {
		min: number;
		max: number;
		idleTimeoutMillis: number;
		connectionTimeoutMillis: number;
	};
}

export const DatabaseConfig: IDatabaseConfig = {
	url: env.DATABASE_URL,
	pool: {
		min: env.DB_POOL_MIN,
		max: env.DB_POOL_MAX,
		idleTimeoutMillis: env.DB_IDLE_TIMEOUT,
		connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT,
	},
};
