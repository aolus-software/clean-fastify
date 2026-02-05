export type RoleList = {
	id: string;
	name: string;
	created_at: Date;
	updated_at: Date;
};

export type RoleDetail = {
	id: string;
	name: string;
	created_at: Date;
	updated_at: Date;
	permissions: {
		group: string;
		names: {
			id: string;
			name: string;
			is_assigned: boolean;
		}[];
	}[];
};
