import { db, PermissionRepository } from "@database";
import { DatatableType, PaginationResponse, PermissionList } from "@types";
import { injectable } from "tsyringe";

@injectable()
export class PermissionService {
	constructor(private _permissionRepository: PermissionRepository) {}

	async findAll(
		queryParams: DatatableType,
	): Promise<PaginationResponse<PermissionList>> {
		return await this._permissionRepository.findAll(queryParams);
	}

	async create(data: { group: string; name: string[] }): Promise<void> {
		await db.transaction(async (tx) => {
			await this._permissionRepository.create(data, tx);
		});
	}

	async detail(permissionId: string): Promise<PermissionList> {
		return await this._permissionRepository.getDetail(permissionId);
	}

	async update(
		permissionId: string,
		data: { name: string; group: string },
	): Promise<void> {
		await db.transaction(async (tx) => {
			await this._permissionRepository.update(permissionId, data, tx);
		});
	}

	async delete(permissionId: string): Promise<void> {
		await db.transaction(async (tx) => {
			await this._permissionRepository.delete(permissionId, tx);
		});
	}
}
