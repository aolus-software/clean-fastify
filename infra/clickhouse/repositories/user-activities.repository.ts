import { BaseRepository } from "./base.repository";
import {
	IUserActivity,
	IDailyActivityStats,
	IUserActivitiesRepository,
} from "./interfaces/user-activities.interface";

export class UserActivitiesRepository
	extends BaseRepository
	implements IUserActivitiesRepository
{
	async getRecentActivities(limit = 100): Promise<IUserActivity[]> {
		return this.query<IUserActivity>(
			`SELECT * FROM user_activities 
			 ORDER BY timestamp DESC 
			 LIMIT {limit:UInt32}`,
			{ limit },
		);
	}

	async getActivitiesByUser(
		userId: string,
		limit = 50,
	): Promise<IUserActivity[]> {
		return this.query<IUserActivity>(
			`SELECT * FROM user_activities 
			 WHERE user_id = {userId:String}
			 ORDER BY timestamp DESC 
			 LIMIT {limit:UInt32}`,
			{ userId, limit },
		);
	}

	async getDailyStats(days = 30): Promise<IDailyActivityStats[]> {
		return this.query<IDailyActivityStats>(
			`SELECT date, user_id, action, activity_count
			 FROM daily_user_activities 
			 WHERE date >= today() - {days:UInt32}
			 ORDER BY date DESC, activity_count DESC`,
			{ days },
		);
	}

	async getTopActions(days = 7): Promise<{ action: string; count: number }[]> {
		return this.query(
			`SELECT action, count() as count
			 FROM user_activities 
			 WHERE timestamp >= now() - INTERVAL {days:UInt32} DAY
			 GROUP BY action 
			 ORDER BY count DESC 
			 LIMIT 10`,
			{ days },
		);
	}

	async insertActivity(
		activity: Omit<IUserActivity, "id" | "timestamp">,
	): Promise<void> {
		await this.insert("user_activities", [activity]);
	}

	async insertBatch(
		activities: Omit<IUserActivity, "id" | "timestamp">[],
	): Promise<void> {
		if (activities.length === 0) return;
		await this.insert("user_activities", activities);
	}
}
