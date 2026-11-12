export const UserInformationCacheKey = (userId: string): string =>
	`user:${userId}`;

export const RefreshTokenCacheKey = (userId: string): string =>
	`refresh_token:${userId}`;

export const UserInformationCacheTtl = 3600;

export const PermissionSelectOptionsCacheKey = (): string =>
	"select_options:permissions";

export const RoleSelectOptionsCacheKey = (): string => "select_options:roles";

export const SelectOptionsCacheTtl = 3600;
