export interface IUserActivity {
	id: string;
	user_id: string;
	action: string;
	resource: string;
	timestamp: string;
	ip_address: string;
	user_agent: string;
	metadata: Record<string, string>;
}

export interface IDailyActivityStats {
	date: string;
	user_id: string;
	action: string;
	activity_count: number;
}

export interface IUserActivitiesRepository {
	getRecentActivities(limit?: number): Promise<IUserActivity[]>;
	getActivitiesByUser(userId: string, limit?: number): Promise<IUserActivity[]>;
	getDailyStats(days?: number): Promise<IDailyActivityStats[]>;
	getTopActions(days?: number): Promise<{ action: string; count: number }[]>;
	insertActivity(
		activity: Omit<IUserActivity, "id" | "timestamp">,
	): Promise<void>;
	insertBatch(
		activities: Omit<IUserActivity, "id" | "timestamp">[],
	): Promise<void>;
}
