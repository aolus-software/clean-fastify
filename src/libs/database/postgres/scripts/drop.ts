import { AppConfig } from "@config";
import { client } from "@database";

/**
 * Drops every table, type and the migration journal by recreating the `public` schema and
 * dropping the `drizzle` schema. `drizzle-kit drop` only deletes migration files, never tables,
 * which is why `make fresh` uses this instead. Refuses to run with NODE_ENV=production.
 */
const drop = async (): Promise<void> => {
	if (AppConfig.APP_ENV === "production") {
		throw new Error("Refusing to drop the database with NODE_ENV=production");
	}

	await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
	await client.query("DROP SCHEMA IF EXISTS public CASCADE");
	await client.query("CREATE SCHEMA public");
};

drop()
	.then(async () => {
		// eslint-disable-next-line no-console
		console.log("Database dropped");
		await client.end();
		process.exit(0);
	})
	.catch(async (error: unknown) => {
		// eslint-disable-next-line no-console
		console.error("Database drop failed", error);
		await client.end().catch(() => undefined);
		process.exit(1);
	});
