import { UserStatusEnum } from "@database";

export type UserInformation = {
	id: string;
	name: string;
	email: string;
	roles: string[];
	permissions: string[];
};

export type UserList = {
	id: string;
	name: string;
	email: string;
	status: UserStatusEnum;
	remark: string | null;
	roles: string[];
	createdAt: Date;
	updatedAt: Date;
};

export type UserCreate = {
	name: string;
	email: string;
	password: string;
	status: UserStatusEnum;
	remark: string | null;
	roleIds: string[];
};

export type UserUpdate = Omit<UserCreate, "password">;

export type UserDetail = Omit<UserList, "roles"> & {
	roles: {
		id: string;
		name: string;
	}[];
};

export type UserForAuth = {
	id: string;
	name: string;
	email: string;
	password: string;
	status: UserStatusEnum;
	email_verified_at: Date | null;
};
