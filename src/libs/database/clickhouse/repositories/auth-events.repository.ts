import { BaseRepository } from "./base.repository";
import { IAuthEvent, IAuthStats } from "./interfaces/auth-events.interface";

export class AuthEventsRepository extends BaseRepository {
	async getRecentEvents(limit = 100): Promise<IAuthEvent[]> {
		return this.query<IAuthEvent>(
			`SELECT * FROM auth_events 
			 ORDER BY timestamp DESC 
			 LIMIT {limit:UInt32}`,
			{ limit },
		);
	}

	async getFailedLogins(hours = 24): Promise<IAuthEvent[]> {
		return this.query<IAuthEvent>(
			`SELECT * FROM auth_events 
			 WHERE event_type = 'failed_login' 
			 AND timestamp >= now() - INTERVAL {hours:UInt32} HOUR
			 ORDER BY timestamp DESC`,
			{ hours },
		);
	}

	async getHourlyStats(days = 7): Promise<IAuthStats[]> {
		return this.query<IAuthStats>(
			`SELECT hour, event_type, successful_count, failed_count
			 FROM hourly_auth_stats 
			 WHERE hour >= now() - INTERVAL {days:UInt32} DAY
			 ORDER BY hour DESC`,
			{ days },
		);
	}

	async getSuspiciousIPs(
		threshold = 5,
	): Promise<{ ip_address: string; failed_attempts: number }[]> {
		return this.query(
			`SELECT ip_address, count() as failed_attempts
			 FROM auth_events 
			 WHERE event_type = 'failed_login' 
			 AND timestamp >= now() - INTERVAL 1 HOUR
			 GROUP BY ip_address 
			 HAVING failed_attempts >= {threshold:UInt32}
			 ORDER BY failed_attempts DESC`,
			{ threshold },
		);
	}

	async insertAuthEvent(
		event: Omit<IAuthEvent, "id" | "timestamp">,
	): Promise<void> {
		const client = this.getClient();
		await client.insert({
			table: "auth_events",
			values: [event],
			format: "JSONEachRow",
		});
	}
}
