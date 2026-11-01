import { db, RoleRepository, UserRepository } from "@database";
import { NotFoundError, UnprocessableEntityError } from "@fastify-libs";
import { t } from "@i18n";
import {
	DatatableType,
	PaginationResponse,
	UserCreate,
	UserDetail,
	UserList,
	UserUpdate,
} from "@types";
import { Hash } from "@utils";
import { injectable } from "tsyringe";

import { AuthMailService } from "../auth-mail.service";
import { SessionService } from "../session.service";

@injectable()
export class UserService {
	constructor(
		private readonly _userRepository: UserRepository,
		private readonly _roleRepository: RoleRepository,
		private readonly _authMailService: AuthMailService,
		private readonly _sessionService: SessionService,
	) {}

	async findAll(
		queryParam: DatatableType,
	): Promise<PaginationResponse<UserList>> {
		return await this._userRepository.findAll(queryParam);
	}

	async findOne(id: string): Promise<UserDetail> {
		const user = await this._userRepository.getDetail(id);
		if (!user) {
			throw new NotFoundError(t("settings.users.notFound"));
		}
		return user;
	}

	async create(data: UserCreate): Promise<void> {
		await this.assertEmailAvailable(data.email);
		await this.assertRolesExist(data.roleIds);

		const password = await Hash.generateHash(data.password);
		await db.transaction(async (tx) => {
			await this._userRepository.create({ ...data, password }, tx);
		});
	}

	async update(id: string, data: UserUpdate): Promise<void> {
		await this.assertExists(id);
		await this.assertEmailAvailable(data.email, id);
		await this.assertRolesExist(data.roleIds);

		await db.transaction(async (tx) => {
			await this._userRepository.update(id, data, tx);
		});
		await this._sessionService.forgetUsers([id]);
	}

	async delete(id: string): Promise<void> {
		await this.assertExists(id);
		await this._userRepository.delete(id);
		await this._sessionService.revokeSessions(id);
	}

	async resetPassword(id: string, newPassword: string): Promise<void> {
		await this.assertExists(id);
		await this._userRepository.updatePassword(
			id,
			await Hash.generateHash(newPassword),
		);
		await this._sessionService.revokeSessions(id);
	}

	async sendVerificationEmail(id: string): Promise<void> {
		const user = await this._userRepository.findForMail(id);
		if (!user) {
			throw new NotFoundError(t("settings.users.notFound"));
		}
		const token = await db.transaction(
			async (tx) =>
				await this._authMailService.issueVerificationToken(user.id, tx),
		);
		await this._authMailService.queueVerificationEmail(user, token);
	}

	async sendResetPasswordEmail(id: string): Promise<void> {
		const user = await this._userRepository.findForMail(id);
		if (!user) {
			throw new NotFoundError(t("settings.users.notFound"));
		}
		const token = await db.transaction(
			async (tx) => await this._authMailService.issueResetToken(user.id, tx),
		);
		await this._authMailService.queueResetPasswordEmail(user, token);
	}

	private async assertExists(id: string): Promise<void> {
		const user = await this._userRepository.findById(id);
		if (!user) {
			throw new NotFoundError(t("settings.users.notFound"));
		}
	}

	private async assertEmailAvailable(
		email: string,
		excludeId?: string,
	): Promise<void> {
		const existing = await this._userRepository.findLiveByEmail(
			email,
			excludeId,
		);
		if (existing) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{ field: "email", message: t("settings.users.emailExists") },
			]);
		}
	}

	private async assertRolesExist(roleIds: string[]): Promise<void> {
		const unique = [...new Set(roleIds)];
		const found = await this._roleRepository.countExisting(unique);
		if (found !== unique.length) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{ field: "roleIds", message: t("settings.users.invalidRoles") },
			]);
		}
	}
}
