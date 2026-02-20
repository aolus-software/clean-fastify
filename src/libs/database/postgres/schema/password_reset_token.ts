import { relations } from "drizzle-orm";
import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { usersTable } from "./user";

export const password_reset_tokensTable = pgTable(
	"password_reset_tokens",
	{
		id: uuid().primaryKey().defaultRandom(),
		user_id: uuid()
			.notNull()
			.references(() => usersTable.id),
		token: varchar({ length: 255 }).notNull(),
		created_at: timestamp().defaultNow(),
		updated_at: timestamp()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("password_reset_token_token_index").on(table.token)],
);

export const password_reset_tokensRelations = relations(
	password_reset_tokensTable,
	({ one }) => ({
		user: one(usersTable, {
			fields: [password_reset_tokensTable.user_id],
			references: [usersTable.id],
		}),
	}),
);

// Type exports
export type PasswordResetToken = typeof password_reset_tokensTable.$inferSelect;
export type InsertPasswordResetToken =
	typeof password_reset_tokensTable.$inferInsert;
