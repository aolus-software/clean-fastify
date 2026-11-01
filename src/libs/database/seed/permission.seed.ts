import { db, permissionsTable } from "@database";
import { logger } from "@utils";

export const permissionGroups = ["user", "role", "permission"];
export const permissionActions = ["list", "create", "detail", "edit", "delete"];

/** The `<group> <action>` catalogue every PermissionGuard string is checked against. */
export const permissionCatalogue = permissionGroups.flatMap((group) =>
	permissionActions.map((action) => ({ name: `${group} ${action}`, group })),
);

export async function seedPermissions(): Promise<void> {
	await db
		.insert(permissionsTable)
		.values(permissionCatalogue)
		.onConflictDoNothing();

	logger.info({ count: permissionCatalogue.length }, "Permissions seeded");
}
