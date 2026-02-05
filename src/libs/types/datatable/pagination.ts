export type PaginationResponse<T> = {
	data: T[];
	meta: {
		page: number;
		limit: number;
		totalCount: number;
	};
};

export type PaginationKeySetResponse<T> = {
	data: T[];
	meta: {
		page: number;
		limit: number;
		totalCount: number;
		nextCursor: string | null;
		previousCursor: string | null;
	};
};
