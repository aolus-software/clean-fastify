import { ClickHouseClient } from "@clickhouse/client";

import { ClickHouseClientManager } from "../client/clickhouse-client";

export class BaseRepository {
	protected client: ClickHouseClient;

	constructor() {
		this.client = ClickHouseClientManager.getInstance();
	}

	protected async query<T>(
		query: string,
		params?: Record<string, unknown>,
	): Promise<T[]> {
		try {
			const resultSet = await this.client.query({
				query,
				query_params: params,
				format: "JSONEachRow",
			});

			return await resultSet.json<T>();
		} catch (error) {
			throw new Error(`Database query failed`, { cause: error });
		}
	}

	protected async insert<T>(table: string, values: T[]): Promise<void> {
		try {
			await this.client.insert({
				table,
				values,
				format: "JSONEachRow",
			});
		} catch (error) {
			throw new Error(`Database insert failed`, {
				cause: error,
			});
		}
	}

	protected getClient(): ClickHouseClient {
		return this.client;
	}
}
