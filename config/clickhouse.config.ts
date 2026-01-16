import { cleanEnv, str, url } from "envalid";

const env = cleanEnv(process.env, {
	CLICKHOUSE_HOST: url({ default: "http://localhost:8123" }),
	CLICKHOUSE_USER: str({ default: "default" }),
	CLICKHOUSE_PASSWORD: str({ default: "" }),
	CLICKHOUSE_DATABASE: str({ default: "default" }),
});

export interface IClickHouseConfig {
	host: string;
	user: string;
	password: string;
	database: string;
}

export const clickhouseConfig: IClickHouseConfig = {
	host: env.CLICKHOUSE_HOST,
	user: env.CLICKHOUSE_USER,
	password: env.CLICKHOUSE_PASSWORD,
	database: env.CLICKHOUSE_DATABASE,
};
