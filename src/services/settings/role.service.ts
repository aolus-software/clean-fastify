import { UnprocessableEntityError } from "@fastify-libs";
import {
	DatatableType,
	PaginationResponse,
	RoleDetail,
	RoleList,
} from "@types";
import { db, permissionsTable, RoleRepository } from "@database";
import { inArray } from "drizzle-orm";
import { injectable } from "tsyringe";

@injectable()
export class RoleService {
	constructor(private _roleRepository: RoleRepository) {}

	async findAll(
		queryParam: DatatableType,
	): Promise<PaginationResponse<RoleList>> {
		return await this._roleRepository.findAll(queryParam);
	}

	async create(data: {
		name: string;
		permissionIds?: string[];
	}): Promise<void> {
		if (!data.permissionIds) {
			data.permissionIds = [];
		}

		// validate the permissions ids
		const validPermissions = await db
			.select()
			.from(permissionsTable)
			.where(inArray(permissionsTable.id, data.permissionIds));

		if (validPermissions.length !== data.permissionIds.length) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "permissionIds",
					message: "One or more permissions are invalid",
				},
			]);
		}

		await db.transaction(async (tx) => {
			await this._roleRepository.create(data, tx);
		});
	}

	async detail(roleId: string): Promise<RoleDetail> {
		return await this._roleRepository.getDetail(roleId);
	}

	async update(
		id: string,
		data: { name: string; permissionIds?: string[] },
	): Promise<void> {
		if (!data.permissionIds) {
			data.permissionIds = [];
		}

		// validate the permissions ids
		const validPermissions = await db
			.select()
			.from(permissionsTable)
			.where(inArray(permissionsTable.id, data.permissionIds));

		if (validPermissions.length !== data.permissionIds.length) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "permissionIds",
					message: "One or more permissions are invalid",
				},
			]);
		}

		await db.transaction(async (tx) => {
			await this._roleRepository.update(id, data, tx);
		});
	}

	async delete(roleId: string): Promise<void> {
		await db.transaction(async (tx) => {
			await this._roleRepository.delete(roleId, tx);
		});
	}
}
