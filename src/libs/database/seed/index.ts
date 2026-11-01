import "reflect-metadata";

import { client } from "@database";

import { seedPermissions } from "./permission.seed";
import { seedRoles } from "./role.seed";
import { seedUsers } from "./user.seed";

const seed = async (): Promise<void> => {
	await seedPermissions();
	await seedRoles();
	await seedUsers();
};

seed()
	.then(async () => {
		// eslint-disable-next-line no-console
		console.log("Seeding completed");
		await client.end();
		process.exit(0);
	})
	.catch(async (error: unknown) => {
		// eslint-disable-next-line no-console
		console.error("Seeding failed", error);
		await client.end().catch(() => undefined);
		process.exit(1);
	});
