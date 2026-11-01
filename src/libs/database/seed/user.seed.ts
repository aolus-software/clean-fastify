import { db, rolesTable, user_rolesTable, usersTable } from "@database";
import { Hash, logger } from "@utils";
import { and, eq, isNull } from "drizzle-orm";

import { roleNames } from "./role.seed";

/** Satisfies StrongPassword, so the seeded accounts can exercise every password path. */
export const seedPassword = "S3crEtP4ssw0rd!";

/**
 * One pre-verified account per baseline role (`<role>@example.com`), holding that role. An
 * existing live account is left alone, so a re-run never rewrites a password changed since.
 */
export async function seedUsers(): Promise<void> {
	for (const name of roleNames) {
		const email = `${name}@example.com`;

		const [existing] = await db
			.select({ id: usersTable.id })
			.from(usersTable)
			.where(and(eq(usersTable.email, email), isNull(usersTable.deleted_at)))
			.limit(1);

		const userId =
			existing?.id ??
			(
				await db
					.insert(usersTable)
					.values({
						name,
						email,
						password: await Hash.generateHash(seedPassword),
						email_verified_at: new Date(),
					})
					.returning({ id: usersTable.id })
			)[0].id;

		const [role] = await db
			.select({ id: rolesTable.id })
			.from(rolesTable)
			.where(eq(rolesTable.name, name))
			.limit(1);

		if (!role) continue;

		await db
			.insert(user_rolesTable)
			.values({ userId, roleId: role.id })
			.onConflictDoNothing();
	}

	logger.info({ users: roleNames.length }, "Users seeded");
}
