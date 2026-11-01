import { ClickHouseClient, createClient } from "@clickhouse/client";
import { clickhouseConfig } from "@config";

export class ClickHouseClientManager {
	private static instance: ClickHouseClient | null = null;

	private constructor() {}

	static getInstance(): ClickHouseClient {
		if (!this.instance) {
			this.instance = createClient({
				host: clickhouseConfig.host,
				username: clickhouseConfig.user,
				password: clickhouseConfig.password,
				database: clickhouseConfig.database,
				compression: {
					request: true,
					response: true,
				},
				clickhouse_settings: {
					async_insert: 1,
					wait_for_async_insert: 0,
				},
			});
		}
		return this.instance;
	}

	static async close(): Promise<void> {
		if (this.instance) {
			await this.instance.close();
			this.instance = null;
		}
	}
}
