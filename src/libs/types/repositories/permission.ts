export type PermissionList = {
	id: string;
	name: string;
	group: string;
	created_at: Date;
	updated_at: Date;
};

export type PermissionSelectOptions = {
	group: string;
	permissions: {
		id: string;
		name: string;
		group: string;
	}[];
};
