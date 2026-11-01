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

export const password_reset_tokensTable = pgTable(
	"password_reset_tokens",
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
		uniqueIndex("password_reset_token_token_unique").on(table.token),
		index("password_reset_token_user_id_used_at_index").on(
			table.user_id,
			table.used_at,
		),
	],
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

export type PasswordResetToken = typeof password_reset_tokensTable.$inferSelect;
export type InsertPasswordResetToken =
	typeof password_reset_tokensTable.$inferInsert;
