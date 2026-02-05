import { schema } from "@database";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

export * from "./user.repository";
export * from "./permission.repository";
export * from "./role.repository";
export * from "./forgot-password.repository";

export type DbTransaction = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;
