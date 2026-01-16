import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./infra/postgres/migrations",
	schema: "./infra/postgres/schema",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
