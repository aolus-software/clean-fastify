import { relations } from "drizzle-orm";
import {
	pgTable,
	uuid,
	varchar,
	primaryKey,
	timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const rolesTable = pgTable("roles", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rolesRelations = relations(rolesTable, ({ many }) => ({
	role_permissions: many(role_permissionsTable),
	user_roles: many(user_rolesTable),
}));

export const permissionsTable = pgTable("permissions", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 255 }).notNull().unique(),
	group: varchar("group", { length: 100 }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const permissionsRelations = relations(permissionsTable, ({ many }) => ({
	role_permissions: many(role_permissionsTable),
}));

export const role_permissionsTable = pgTable(
	"role_permissions",
	{
		roleId: uuid("role_id")
			.notNull()
			.references(() => rolesTable.id, { onDelete: "cascade" }),
		permissionId: uuid("permission_id")
			.notNull()
			.references(() => permissionsTable.id, { onDelete: "cascade" }),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
	}),
);

export const role_permissionsRelations = relations(
	role_permissionsTable,
	({ one }) => ({
		role: one(rolesTable, {
			fields: [role_permissionsTable.roleId],
			references: [rolesTable.id],
		}),
		permission: one(permissionsTable, {
			fields: [role_permissionsTable.permissionId],
			references: [permissionsTable.id],
		}),
	}),
);

export const user_rolesTable = pgTable(
	"user_roles",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		roleId: uuid("role_id")
			.notNull()
			.references(() => rolesTable.id, { onDelete: "cascade" }),
		assignedAt: timestamp("assigned_at").defaultNow().notNull(),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.userId, table.roleId] }),
	}),
);

export const user_rolesRelations = relations(user_rolesTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [user_rolesTable.userId],
		references: [usersTable.id],
	}),
	role: one(rolesTable, {
		fields: [user_rolesTable.roleId],
		references: [rolesTable.id],
	}),
}));

export type Role = typeof rolesTable.$inferSelect;
export type Permission = typeof permissionsTable.$inferSelect;
export type RolePermission = typeof role_permissionsTable.$inferSelect;
export type UserRole = typeof user_rolesTable.$inferSelect;

// Consider adding Insert types as well for better type safety
export type InsertRole = typeof rolesTable.$inferInsert;
export type InsertPermission = typeof permissionsTable.$inferInsert;
export type InsertRolePermission = typeof role_permissionsTable.$inferInsert;
export type InsertUserRole = typeof user_rolesTable.$inferInsert;
