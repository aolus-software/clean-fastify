export type RoleList = {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
};

export type RoleDetail = RoleList & {
	permissions: {
		group: string;
		names: {
			id: string;
			name: string;
			isAssigned: boolean;
		}[];
	}[];
};
