import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DatabaseConfig } from "config/database.config";
import { schema } from "./schema";

const connectionString = DatabaseConfig.url;
const client = new Pool({ connectionString });

const db = drizzle(client, { schema });

export { db };

export * from "./schema";
