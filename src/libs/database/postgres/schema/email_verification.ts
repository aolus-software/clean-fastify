import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { relations } from "drizzle-orm";

export const email_verificationsTable = pgTable(
	"email_verifications",
	{
		id: uuid().primaryKey().defaultRandom(),
		user_id: uuid()
			.notNull()
			.references(() => usersTable.id),
		token: varchar({ length: 255 }).notNull(),
		expired_at: timestamp().notNull(),
		created_at: timestamp().defaultNow(),
		updated_at: timestamp()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("email_verification_token_index").on(table.token)],
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

// Type exports
export type EmailVerification = typeof email_verificationsTable.$inferSelect;
export type InsertEmailVerification =
	typeof email_verificationsTable.$inferInsert;
