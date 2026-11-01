import { PermissionRepository, RoleRepository } from "@database";
import { PermissionSelectOptions } from "@types";
import { injectable } from "tsyringe";

@injectable()
export class SelectOptionService {
	constructor(
		private readonly _permissionRepository: PermissionRepository,
		private readonly _roleRepository: RoleRepository,
	) {}

	async permissions(): Promise<PermissionSelectOptions[]> {
		return await this._permissionRepository.selectOptions();
	}

	async roles(): Promise<{ id: string; name: string }[]> {
		return await this._roleRepository.selectOptions();
	}
}
