import { UserRepository } from "@database";
import { UnauthorizedError, UnprocessableEntityError } from "@fastify-libs";
import { t } from "@i18n";
import { UserInformation } from "@types";
import { Hash } from "@utils";
import { injectable } from "tsyringe";

import { SessionService } from "./session.service";

@injectable()
export class ProfileService {
	constructor(
		private readonly _userRepository: UserRepository,
		private readonly _sessionService: SessionService,
	) {}

	async updateProfile(
		userId: string,
		data: { name: string; email: string },
	): Promise<UserInformation> {
		const existing = await this._userRepository.findLiveByEmail(
			data.email,
			userId,
		);
		if (existing) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{ field: "email", message: t("settings.users.emailExists") },
			]);
		}

		await this._userRepository.updateProfile(userId, data);
		await this._sessionService.forgetUsers([userId]);

		const information = await this._sessionService.getUserInformation(userId);
		if (!information) {
			throw new UnauthorizedError(t("auth.userNotFound"));
		}
		return information;
	}

	async updatePassword(
		userId: string,
		data: { currentPassword: string; newPassword: string },
	): Promise<void> {
		const currentHash = await this._userRepository.findPasswordHash(userId);
		if (!currentHash) {
			throw new UnauthorizedError(t("auth.userNotFound"));
		}

		const isPasswordValid = await Hash.compareHash(
			data.currentPassword,
			currentHash,
		);
		if (!isPasswordValid) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{
					field: "currentPassword",
					message: t("profile.currentPasswordIncorrect"),
				},
			]);
		}

		await this._userRepository.updatePassword(
			userId,
			await Hash.generateHash(data.newPassword),
		);
		await this._sessionService.revokeSessions(userId);
	}
}
