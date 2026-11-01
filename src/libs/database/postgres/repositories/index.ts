import { schema } from "@database";
import { ExtractTablesWithRelations } from "drizzle-orm";
import { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { PgTransaction } from "drizzle-orm/pg-core";

export * from "./email-verification.repository";
export * from "./forgot-password.repository";
export * from "./permission.repository";
export * from "./role.repository";
export * from "./user.repository";

export type DbTransaction = PgTransaction<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;
