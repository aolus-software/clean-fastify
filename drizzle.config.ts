import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./infra/postgres/migrations",
	schema: "./infra/postgres",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
