// Drizzle
export * from "./email_verification";
export * from "./password_reset_token";
export * from "./rbac";
export * from "./user";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Import all tables
import {
	email_verificationsTable,
	email_verificationsRelations,
} from "./email_verification";
import {
	password_reset_tokensTable,
	password_reset_tokensRelations,
} from "./password_reset_token";
import {
	rolesTable,
	permissionsTable,
	role_permissionsTable,
	user_rolesTable,
	rolesRelations,
	permissionsRelations,
	role_permissionsRelations,
	user_rolesRelations,
} from "./rbac";
import { usersTable, usersRelations } from "./user";
import { DatabaseConfig } from "config/database.config";

export const schema = {
	// Tables
	users: usersTable,
	roles: rolesTable,
	permissions: permissionsTable,
	role_permissions: role_permissionsTable,
	user_roles: user_rolesTable,
	email_verifications: email_verificationsTable,
	password_reset_tokens: password_reset_tokensTable,

	// Relations
	usersRelations,
	rolesRelations,
	permissionsRelations,
	role_permissionsRelations,
	user_rolesRelations,
	email_verificationsRelations,
	password_reset_tokensRelations,
};

const connectionString = DatabaseConfig.url;
const client = new Pool({ connectionString });

const db = drizzle(client, { schema });

export {
	db,
	usersTable,
	rolesTable,
	permissionsTable,
	role_permissionsTable,
	user_rolesTable,
	email_verificationsTable,
	password_reset_tokensTable,
};
