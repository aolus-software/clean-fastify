import { UnprocessableEntityError } from "packages/error/custom.errors";
import { DatatableType } from "packages/types/datatable";
import { PaginationResponse } from "packages/types/pagination";
import { db, permissionsTable } from "@postgres/index";
import { inArray } from "drizzle-orm";
import {
	RoleDetail,
	RoleList,
	RoleRepository,
} from "@infra/postgres/repositories";
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
