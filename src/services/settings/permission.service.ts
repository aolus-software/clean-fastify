import { PermissionRepository, UserRepository } from "@database";
import { NotFoundError, UnprocessableEntityError } from "@fastify-libs";
import { t } from "@i18n";
import { DatatableType, PaginationResponse, PermissionList } from "@types";
import { injectable } from "tsyringe";

import { SessionService } from "../session.service";

@injectable()
export class PermissionService {
	constructor(
		private readonly _permissionRepository: PermissionRepository,
		private readonly _userRepository: UserRepository,
		private readonly _sessionService: SessionService,
	) {}

	async findAll(
		queryParams: DatatableType,
	): Promise<PaginationResponse<PermissionList>> {
		return await this._permissionRepository.findAll(queryParams);
	}

	async findOne(id: string): Promise<PermissionList> {
		const permission = await this._permissionRepository.findById(id);
		if (!permission) {
			throw new NotFoundError(t("settings.permissions.notFound"));
		}
		return permission;
	}

	/** Each entry in `name` is an action; the stored name is `"<group> <action>"`, as the seeder writes it. */
	async create(data: { group: string; name: string[] }): Promise<void> {
		const names = [
			...new Set(data.name.map((action) => `${data.group} ${action}`)),
		];
		const existing =
			await this._permissionRepository.findExistingByNames(names);
		if (existing.length > 0) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{
					field: "name",
					message: t("settings.permissions.nameExists", {
						name: existing.join(", "),
					}),
				},
			]);
		}

		await this._permissionRepository.createMany(
			names.map((name) => ({ name, group: data.group })),
		);
	}

	/** `name` is stored verbatim, so it must be the full `"<group> <action>"` string. */
	async update(
		id: string,
		data: { name: string; group: string },
	): Promise<void> {
		await this.findOne(id);

		const existing = await this._permissionRepository.findByName(data.name, id);
		if (existing) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{
					field: "name",
					message: t("settings.permissions.nameExists", { name: data.name }),
				},
			]);
		}

		await this._permissionRepository.update(id, data);
		await this._sessionService.forgetUsers(
			await this._userRepository.findIdsByPermission(id),
		);
	}

	async delete(id: string): Promise<void> {
		await this.findOne(id);
		const holders = await this._userRepository.findIdsByPermission(id);
		await this._permissionRepository.delete(id);
		await this._sessionService.forgetUsers(holders);
	}
}
