import {
	IDailyActivityStats,
	IUserActivity,
} from "../repositories/interfaces/user-activities.interface";
import { UserActivitiesRepository } from "../repositories/user-activities.repository";

export class UserActivitiesService {
	constructor(private repository: UserActivitiesRepository) {}

	async trackActivity(
		activity: Omit<IUserActivity, "id" | "timestamp">,
	): Promise<void> {
		// Add business logic here (validation, enrichment, etc.)
		await this.repository.insertActivity(activity);
	}

	async trackActivitiesBatch(
		activities: Omit<IUserActivity, "id" | "timestamp">[],
	): Promise<void> {
		// Validate batch size
		if (activities.length > 10000) {
			throw new Error("Batch size exceeds limit of 10000");
		}
		await this.repository.insertBatch(activities);
	}

	async getUserActivityHistory(
		userId: string,
		options?: { limit?: number },
	): Promise<IUserActivity[]> {
		return this.repository.getActivitiesByUser(userId, options?.limit);
	}

	async getRecentGlobalActivities(limit = 100): Promise<IUserActivity[]> {
		return this.repository.getRecentActivities(limit);
	}

	async getActivityStatistics(days = 30): Promise<IDailyActivityStats[]> {
		return this.repository.getDailyStats(days);
	}

	async getPopularActions(
		days = 7,
	): Promise<{ action: string; count: number }[]> {
		return this.repository.getTopActions(days);
	}
}

// Factory function for dependency injection
export const createUserActivitiesService = () => {
	const repository = new UserActivitiesRepository();
	return new UserActivitiesService(repository);
};
