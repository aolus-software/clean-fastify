import { relations } from "drizzle-orm";
import {
	index,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { usersTable } from "./user";

export const email_verificationsTable = pgTable(
	"email_verifications",
	{
		id: uuid().primaryKey().defaultRandom(),
		user_id: uuid()
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		token: varchar({ length: 255 }).notNull(),
		expired_at: timestamp().notNull(),
		used_at: timestamp(),
		created_at: timestamp().defaultNow(),
		updated_at: timestamp()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("email_verification_token_unique").on(table.token),
		index("email_verification_user_id_used_at_index").on(
			table.user_id,
			table.used_at,
		),
	],
);

export const email_verificationsRelations = relations(
	email_verificationsTable,
	({ one }) => ({
		user: one(usersTable, {
			fields: [email_verificationsTable.user_id],
			references: [usersTable.id],
		}),
	}),
);

export type EmailVerification = typeof email_verificationsTable.$inferSelect;
export type InsertEmailVerification =
	typeof email_verificationsTable.$inferInsert;
