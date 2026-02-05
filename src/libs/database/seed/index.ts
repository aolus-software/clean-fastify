import "reflect-metadata";
import { RBACSeeder } from "./rbac.seed";
import { UserSeeder } from "./user.seed";

const run = async () => {
	await RBACSeeder();
	await UserSeeder();
};

await run()
	.then(() => {
		// eslint-disable-next-line
		console.log("Seeding completed successfully");
	})
	.finally(() => {
		process.exit(0);
	})
	.catch((error) => {
		// eslint-disable-next-line
		console.error("Error occurred during seeding:", error);
	});
