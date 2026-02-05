export interface IAuthEvent {
	id: string;
	user_id: string;
	event_type: "login" | "logout" | "failed_login" | "password_change";
	timestamp: string;
	ip_address: string;
	country: string;
	success: boolean;
	failure_reason: string;
}

export interface IAuthStats {
	hour: string;
	event_type: string;
	successful_count: number;
	failed_count: number;
}
