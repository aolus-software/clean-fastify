import { UnprocessableEntityError } from "packages/error/custom.errors";
import {
	UserDetail,
	UserList,
	UserRepository,
} from "@infra/postgres/repositories";
import { DatatableType } from "packages/types/datatable";
import { PaginationResponse } from "packages/types/pagination";
import { db, rolesTable } from "@postgres/index";
import { and, eq, inArray, isNull, not } from "drizzle-orm";
import { usersTable } from "@infra/postgres";
import { Hash } from "@security/hash";
import { injectable } from "tsyringe";

@injectable()
export class UserService {
	constructor(private readonly _userRepository: UserRepository) {}

	async findAll(
		queryParam: DatatableType,
	): Promise<PaginationResponse<UserList>> {
		return await this._userRepository.findAll(queryParam);
	}

	async create(data: {
		name: string;
		email: string;
		password: string;
		roleIds: string[];
	}): Promise<void> {
		const isEmailExists = await db.query.users.findFirst({
			where: and(
				eq(usersTable.email, data.email),
				isNull(usersTable.deleted_at),
			),
			columns: {
				id: true,
			},
		});

		if (isEmailExists) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Email already exists",
				},
			]);
		}

		// validate the user roles
		const validRoles = await db
			.select()
			.from(rolesTable)
			.where(inArray(rolesTable.id, data.roleIds));

		if (validRoles.length !== data.roleIds.length) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "roleIds",
					message: "One or more roles are invalid",
				},
			]);
		}

		await db.transaction(async (tx) => {
			await this._userRepository.create(data, tx);
		});
	}

	async detail(userId: string): Promise<UserDetail> {
		return await this._userRepository.getDetail(userId);
	}

	async update(
		id: string,
		data: { name: string; email: string; roleIds: string[] },
	): Promise<void> {
		const isEmailExists = await this._userRepository.db.query.users.findFirst({
			where: and(
				eq(usersTable.email, data.email),
				isNull(usersTable.deleted_at),
				not(eq(usersTable.id, id)),
			),
		});
		if (isEmailExists) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Email already exists",
				},
			]);
		}

		// validate the user roles
		const validRoles = await db
			.select()
			.from(rolesTable)
			.where(inArray(rolesTable.id, data.roleIds));

		if (validRoles.length !== data.roleIds.length) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "roleIds",
					message: "One or more roles are invalid",
				},
			]);
		}

		await db.transaction(async (tx) => {
			await this._userRepository.update(id, data, tx);
		});
	}

	async delete(userId: string): Promise<void> {
		await db.transaction(async (tx) => {
			await this._userRepository.delete(userId, tx);
		});
	}

	async resetPassword(
		userId: string,
		data: { password: string },
	): Promise<void> {
		await db.transaction(async (tx) => {
			await tx
				.update(usersTable)
				.set({
					password: await Hash.generateHash(data.password),
				})
				.where(eq(usersTable.id, userId));
		});
	}
}
