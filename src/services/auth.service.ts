import { Hash, StrToolkit } from "@utils";
import { UnprocessableEntityError } from "@fastify-libs";
import {
	ForgotPasswordRepository,
	UserRepository,
	RedisClient,
} from "@database";
import { UserInformation } from "@types";
import {
	usersTable,
	db,
	email_verificationsTable,
	password_reset_tokensTable,
} from "@database";
import { and, eq, isNull } from "drizzle-orm";
import { verificationTokenLifetime } from "@fastify-libs";
import { AppConfig } from "@config";
import { sendEmailQueue } from "@bull/queue/send-email.queue";
import { injectable } from "@fastify-libs";

@injectable()
export class AuthService {
	constructor(
		private _userRepository: UserRepository,
		private _forgotPasswordRepository: ForgotPasswordRepository,
	) {}

	async login(email: string, password: string): Promise<UserInformation> {
		const user = await this._userRepository.findByEmail(email);

		if (user.email_verified_at === null) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Email not verified",
				},
			]);
		}

		if (user.status !== "active") {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Your account is not active. Please contact administrator.",
				},
			]);
		}

		const isPasswordValid = await Hash.compareHash(password, user.password);
		if (!isPasswordValid) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Invalid email or password",
				},
			]);
		}

		return await this._userRepository.UserInformation(user.id);
	}

	async register(payload: {
		name: string;
		email: string;
		password: string;
	}): Promise<void> {
		const user = await this._userRepository.db.query.users.findFirst({
			where: and(
				eq(usersTable.email, payload.email),
				isNull(usersTable.deleted_at),
			),
		});

		if (user) {
			throw new UnprocessableEntityError("Email already in use", [
				{
					field: "email",
					message: "The provided email is already registered",
				},
			]);
		}

		const hashedPassword = await Hash.generateHash(payload.password);
		await db.transaction(async (trx) => {
			const newUser = await trx
				.insert(usersTable)
				.values({
					name: payload.name,
					email: payload.email,
					password: hashedPassword,
					status: "active",
				})
				.returning();

			const token = StrToolkit.random(255);
			await trx.insert(email_verificationsTable).values({
				token,
				user_id: newUser[0].id,
				expired_at: verificationTokenLifetime,
			});

			await sendEmailQueue.add("send-email", {
				subject: "Email verification",
				to: payload.email,
				template: "/auth/email-verification",
				variables: {
					user_id: newUser[0].id,
					user_name: newUser[0].name,
					user_email: newUser[0].email,
					verification_url: `${AppConfig.CLIENT_URL}/auth/verify-email?token=${token}`,
				},
			});
		});
	}

	async resendVerification(payload: { email: string }): Promise<void> {
		const user = await this._userRepository.findByEmail(payload.email);
		if (!user) {
			return;
		}

		if (user.email_verified_at !== null) {
			throw new UnprocessableEntityError("Email already verified", [
				{
					field: "email",
					message: "This email has already been verified",
				},
			]);
		}

		const token = StrToolkit.random(255);
		await db.transaction(async (trx) => {
			await trx.insert(email_verificationsTable).values({
				token,
				user_id: user.id,
				expired_at: verificationTokenLifetime,
			});

			await sendEmailQueue.add("send-email", {
				subject: "Email verification",
				to: payload.email,
				template: "/auth/email-verification",
				variables: {
					user_id: user.id,
					user_name: user.name,
					user_email: user.email,
					verification_url: `${AppConfig.CLIENT_URL}/auth/verify-email?token=${token}`,
				},
			});
		});
	}

	async verifyEmail(payload: { token: string }): Promise<void> {
		const verificationRecord = await db
			.select()
			.from(email_verificationsTable)
			.where(eq(email_verificationsTable.token, payload.token))
			.limit(1);

		if (verificationRecord.length === 0) {
			throw new UnprocessableEntityError("Invalid verification token", [
				{
					field: "token",
					message: "The provided verification token is invalid",
				},
			]);
		}

		await db.transaction(async (trx) => {
			await trx
				.update(usersTable)
				.set({ email_verified_at: new Date() })
				.where(eq(usersTable.id, verificationRecord[0].user_id));

			await trx
				.delete(email_verificationsTable)
				.where(eq(email_verificationsTable.id, verificationRecord[0].id));
		});
	}

	async forgotPassword(email: string): Promise<void> {
		const user = await this._userRepository.db.query.users.findFirst({
			where: eq(usersTable.email, email),
		});
		if (!user) {
			return;
		}

		const token = StrToolkit.random(255);
		await this._forgotPasswordRepository.create({
			user_id: user.id,
			token,
		});

		await sendEmailQueue.add("send-email", {
			subject: "Reset Password",
			to: email,
			template: "/auth/forgot-password",
			variables: {
				user_id: user.id,
				user_name: user.name,
				user_email: user.email,
				reset_password_url: `${AppConfig.CLIENT_URL}/auth/reset-password?token=${token}`,
			},
		});
	}

	async resetPassword(token: string, newPassword: string): Promise<void> {
		const passwordReset =
			await this._forgotPasswordRepository.findByToken(token);
		if (!passwordReset) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "token",
					message: "Invalid or expired password reset token",
				},
			]);
		}

		const user = await this._userRepository.db.query.users.findFirst({
			where: eq(usersTable.id, passwordReset.user_id),
		});
		if (!user) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "token",
					message: "Invalid or expired password reset token",
				},
			]);
		}

		const hashPassword = await Hash.generateHash(newPassword);
		await db.transaction(async (trx) => {
			await trx
				.update(usersTable)
				.set({
					password: hashPassword,
				})
				.where(eq(usersTable.id, user.id));

			await trx
				.delete(password_reset_tokensTable)
				.where(eq(password_reset_tokensTable.user_id, user.id));
		});
	}

	async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
		const redis = RedisClient.getRedisClient();
		const key = `refresh_token:${userId}`;
		await redis.set(
			key,
			refreshToken,
			"EX",
			AppConfig.APP_JWT_REFRESH_EXPIRES_IN,
		);
	}

	async validateRefreshToken(
		refreshToken: string,
		userId: string,
	): Promise<boolean> {
		const redis = RedisClient.getRedisClient();
		const key = `refresh_token:${userId}`;
		const storedToken = await redis.get(key);
		return storedToken === refreshToken;
	}

	async revokeRefreshToken(userId: string): Promise<void> {
		const redis = RedisClient.getRedisClient();
		const key = `refresh_token:${userId}`;
		await redis.del(key);
	}
}
