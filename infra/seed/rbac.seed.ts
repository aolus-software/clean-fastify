import { db, permissionsTable, rolesTable } from "infra/postgres";

export const RBACSeeder = () => {
	return db.transaction(async (tx) => {
		const roleNames = ["superuser", "admin"];
		await Promise.all(
			roleNames.map(async (role) => {
				await tx.insert(rolesTable).values({
					name: role,
				});
			}),
		);

		const groupNames = ["user", "permission"];
		const permissionNames = ["list", "create", "detail", "edit", "delete"];
		await Promise.all(
			groupNames.map(async (group) => {
				await Promise.all(
					permissionNames.map(async (permission) => {
						await tx.insert(permissionsTable).values({
							name: `${group} ${permission}`,
							group: group,
						});
					}),
				);
			}),
		);
	});
};
