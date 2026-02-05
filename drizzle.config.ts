import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./src/libs/database/postgres/migrations",
	schema: "./src/libs/database/postgres/schema",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
