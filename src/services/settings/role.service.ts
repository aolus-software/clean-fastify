import {
	db,
	PermissionRepository,
	RoleRepository,
	UserRepository,
} from "@database";
import { NotFoundError, UnprocessableEntityError } from "@fastify-libs";
import { t } from "@i18n";
import {
	DatatableType,
	PaginationResponse,
	RoleDetail,
	RoleList,
} from "@types";
import { injectable } from "tsyringe";

import { SessionService } from "../session.service";
import { SelectOptionService } from "./select-option.service";

type RoleInput = { name: string; permissionIds: string[] };

@injectable()
export class RoleService {
	constructor(
		private readonly _roleRepository: RoleRepository,
		private readonly _permissionRepository: PermissionRepository,
		private readonly _userRepository: UserRepository,
		private readonly _sessionService: SessionService,
		private readonly _selectOptionService: SelectOptionService,
	) {}

	async findAll(
		queryParam: DatatableType,
	): Promise<PaginationResponse<RoleList>> {
		return await this._roleRepository.findAll(queryParam);
	}

	async findOne(id: string): Promise<RoleDetail> {
		const role = await this._roleRepository.getDetail(id);
		if (!role) {
			throw new NotFoundError(t("settings.roles.notFound"));
		}
		return role;
	}

	async create(data: RoleInput): Promise<void> {
		await this.assertNameAvailable(data.name);
		await this.assertPermissionsExist(data.permissionIds);

		await db.transaction(async (tx) => {
			await this._roleRepository.create(this.dedupe(data), tx);
		});
		await this._selectOptionService.forget();
	}

	async update(id: string, data: RoleInput): Promise<void> {
		await this.assertExists(id);
		await this.assertNameAvailable(data.name, id);
		await this.assertPermissionsExist(data.permissionIds);

		await db.transaction(async (tx) => {
			await this._roleRepository.update(id, this.dedupe(data), tx);
		});
		await this._selectOptionService.forget();
		await this._sessionService.forgetUsers(
			await this._userRepository.findIdsByRole(id),
		);
	}

	async delete(id: string): Promise<void> {
		await this.assertExists(id);
		const holders = await this._userRepository.findIdsByRole(id);
		await this._roleRepository.delete(id);
		await this._selectOptionService.forget();
		await this._sessionService.forgetUsers(holders);
	}

	private dedupe(data: RoleInput): RoleInput {
		return { name: data.name, permissionIds: [...new Set(data.permissionIds)] };
	}

	private async assertExists(id: string): Promise<void> {
		const role = await this._roleRepository.findById(id);
		if (!role) {
			throw new NotFoundError(t("settings.roles.notFound"));
		}
	}

	private async assertNameAvailable(
		name: string,
		excludeId?: string,
	): Promise<void> {
		const existing = await this._roleRepository.findByName(name, excludeId);
		if (existing) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{ field: "name", message: t("settings.roles.nameExists", { name }) },
			]);
		}
	}

	private async assertPermissionsExist(permissionIds: string[]): Promise<void> {
		const unique = [...new Set(permissionIds)];
		const found = await this._permissionRepository.countExisting(unique);
		if (found !== unique.length) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{
					field: "permissionIds",
					message: t("settings.roles.invalidPermissions"),
				},
			]);
		}
	}
}
