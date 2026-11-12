import { AppConfig, DatabaseConfig } from "@config";
import { createLogger, logger } from "@utils";
import type { Logger } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { schema } from "./schema";

/**
 * Debug-level SQL log behind DB_LOG_QUERIES. Only the statement text and the
 * parameter count are written: parameters carry password hashes and tokens.
 */
class QueryLogger implements Logger {
	private readonly _logger = createLogger({ level: AppConfig.LOG_LEVEL });

	logQuery(query: string, params: unknown[]): void {
		this._logger.debug({ query, paramCount: params.length }, "db query");
	}
}

const client = new Pool({
	connectionString: DatabaseConfig.url,
	min: DatabaseConfig.pool.min,
	max: DatabaseConfig.pool.max,
	idleTimeoutMillis: DatabaseConfig.pool.idleTimeoutMillis,
	connectionTimeoutMillis: DatabaseConfig.pool.connectionTimeoutMillis,
});

client.on("error", (error) => {
	logger.error({ error }, "Idle PostgreSQL client error");
});

const db = drizzle(client, {
	schema,
	logger: DatabaseConfig.logQueries ? new QueryLogger() : false,
});

export { client, db };

export * from "./repositories";
export * from "./schema";
