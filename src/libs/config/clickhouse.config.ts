import { env } from "./env.config";

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
