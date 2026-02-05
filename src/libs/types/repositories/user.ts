import { UserStatusEnum } from "@database";

export type UserInformation = {
	id: string;
	name: string;
	email: string;
	roles: string[];
	permissions: {
		name: string;
		permissions: string[];
	}[];
};

export type UserList = {
	id: string;
	name: string;
	email: string;
	status: UserStatusEnum | null;
	roles: string[] | null;
	created_at: Date | null;
	updated_at: Date | null;
};

export type UserCreate = {
	name: string;
	email: string;
	password: string;
	status?: UserStatusEnum;
	remark?: string;
	roleIds?: string[];
};

export type UserDetail = {
	id: string;
	name: string;
	email: string;
	status: UserStatusEnum | null;
	remark: string | null;
	roles: {
		id: string;
		name: string;
	}[];
	created_at: Date | null;
	updated_at: Date | null;
};

export type UserForAuth = {
	id: string;
	name: string;
	email: string;
	password: string;
	status: UserStatusEnum | null;
	email_verified_at: Date | null;
};
