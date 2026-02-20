import { UserRepository, usersTable } from "@database";
import { UnauthorizedError, UnprocessableEntityError } from "@fastify-libs";
import { UserInformation } from "@types";
import { Hash } from "@utils";
import { and, eq, isNull } from "drizzle-orm";
import { injectable } from "tsyringe";

@injectable()
export class ProfileService {
	constructor(private readonly _userRepository: UserRepository) {}

	async updateProfile(
		userId: string,
		data: { name: string; email: string },
	): Promise<UserInformation> {
		const user = await this._userRepository.db.query.users.findFirst({
			where: and(eq(usersTable.id, userId), isNull(usersTable.deleted_at)),
		});

		if (!user) {
			throw new UnauthorizedError("User not found");
		}

		await this._userRepository.db
			.update(usersTable)
			.set({
				name: data.name,
				email: data.email,
				updated_at: new Date(),
			})
			.where(eq(usersTable.id, userId));

		return await this._userRepository.UserInformation(userId);
	}

	async updatePassword(
		userId: string,
		data: {
			password: string;
			currentPassword: string;
		},
	): Promise<void> {
		const user = await this._userRepository.db.query.users.findFirst({
			where: and(eq(usersTable.id, userId), isNull(usersTable.deleted_at)),
		});

		if (!user) {
			throw new UnauthorizedError("User not found");
		}

		const isPasswordValid = await Hash.compareHash(
			data.currentPassword,
			user.password,
		);

		if (!isPasswordValid) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "currentPassword",
					message: "Current password is incorrect",
				},
			]);
		}

		const hashedPassword = await Hash.generateHash(data.password);
		await this._userRepository.db
			.update(usersTable)
			.set({
				password: hashedPassword,
				updated_at: new Date(),
			})
			.where(eq(usersTable.id, userId));
	}
}
