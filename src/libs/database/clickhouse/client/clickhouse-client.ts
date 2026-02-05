import { createClient, ClickHouseClient } from "@clickhouse/client";

export class ClickHouseClientManager {
	private static instance: ClickHouseClient | null = null;

	private constructor() {}

	static getInstance(): ClickHouseClient {
		if (!this.instance) {
			this.instance = createClient({
				host: process.env.CLICKHOUSE_HOST || "http://localhost:8123",
				username: process.env.CLICKHOUSE_USER || "default",
				password: process.env.CLICKHOUSE_PASSWORD || "",
				database: process.env.CLICKHOUSE_DATABASE || "default",
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
