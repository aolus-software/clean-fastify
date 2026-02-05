import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DatabaseConfig } from "@config";
import { schema } from "./schema";

const client = new Pool({
	connectionString: DatabaseConfig.url,
	min: DatabaseConfig.pool.min,
	max: DatabaseConfig.pool.max,
	idleTimeoutMillis: DatabaseConfig.pool.idleTimeoutMillis,
	connectionTimeoutMillis: DatabaseConfig.pool.connectionTimeoutMillis,
});

const db = drizzle(client, { schema });

export { db, client };

export * from "./schema";
export * from "./repositories";
