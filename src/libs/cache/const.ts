export const UserInformationCacheKey = (userId: string): string =>
	`user:${userId}`;

export const RefreshTokenCacheKey = (userId: string): string =>
	`refresh_token:${userId}`;

export const UserInformationCacheTtl = 3600;
