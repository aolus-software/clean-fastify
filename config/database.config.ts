interface IDatabaseConfig {
	url: string;
}

export const DatabaseConfig: IDatabaseConfig = {
	url:
		process.env.DATABASE_URL || "postgres://user:password@localhost:5432/mydb",
};
