import {
	db,
	permissionsTable,
	role_permissionsTable,
	rolesTable,
} from "@database";
import { logger } from "@utils";
import { eq, inArray } from "drizzle-orm";

import { permissionCatalogue } from "./permission.seed";

export const roleNames = ["superuser", "admin"];

/**
 * Seeds both baseline roles and grants each the whole seeded catalogue. The grant read is scoped
 * to the catalogue names so a permission an operator added later is never granted silently.
 * Every insert ends in onConflictDoNothing, so a re-run is a no-op.
 */
export async function seedRoles(): Promise<void> {
	const grantable = await db
		.select({ id: permissionsTable.id })
		.from(permissionsTable)
		.where(
			inArray(
				permissionsTable.name,
				permissionCatalogue.map((permission) => permission.name),
			),
		);

	for (const name of roleNames) {
		await db.insert(rolesTable).values({ name }).onConflictDoNothing();

		const [role] = await db
			.select({ id: rolesTable.id })
			.from(rolesTable)
			.where(eq(rolesTable.name, name))
			.limit(1);

		if (!role || grantable.length === 0) continue;

		await db
			.insert(role_permissionsTable)
			.values(
				grantable.map((permission) => ({
					roleId: role.id,
					permissionId: permission.id,
				})),
			)
			.onConflictDoNothing();
	}

	logger.info({ roles: roleNames.length }, "Roles seeded");
}
