import {
	Cache,
	PermissionSelectOptionsCacheKey,
	RoleSelectOptionsCacheKey,
	SelectOptionsCacheTtl,
} from "@cache";
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
		const key = PermissionSelectOptionsCacheKey();
		const cached = await Cache.get<PermissionSelectOptions[]>(key);
		if (cached) return cached;

		const options = await this._permissionRepository.selectOptions();
		await Cache.set(key, options, SelectOptionsCacheTtl);
		return options;
	}

	async roles(): Promise<{ id: string; name: string }[]> {
		const key = RoleSelectOptionsCacheKey();
		const cached = await Cache.get<{ id: string; name: string }[]>(key);
		if (cached) return cached;

		const options = await this._roleRepository.selectOptions();
		await Cache.set(key, options, SelectOptionsCacheTtl);
		return options;
	}

	/** Drops both cached lists; called after any role or permission write. */
	async forget(): Promise<void> {
		await Cache.deleteMany([
			PermissionSelectOptionsCacheKey(),
			RoleSelectOptionsCacheKey(),
		]);
	}
}
