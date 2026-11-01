import { Cache, RefreshTokenCacheKey } from "@cache";
import { JwtConfig } from "@config";
import {
	db,
	EmailVerificationRepository,
	ForgotPasswordRepository,
	UserRepository,
} from "@database";
import type { JWT } from "@fastify/jwt";
import {
	BadRequestError,
	injectable,
	UnauthorizedError,
	UnprocessableEntityError,
} from "@fastify-libs";
import { t } from "@i18n";
import { UserInformation } from "@types";
import { Hash, logger, StrToolkit } from "@utils";

import { AuthMailService } from "./auth-mail.service";
import { SessionService } from "./session.service";

export type AccessTokenPayload = { id: string; type: "access" };
type RefreshTokenPayload = { id: string; type: "refresh"; jti: string };

export type TokenPair = { accessToken: string; refreshToken: string };

/* A real bcrypt hash of a random string. Login compares against it when the email is unknown so
   the response time does not reveal whether an account exists. */
const DUMMY_PASSWORD_HASH =
	"$2b$10$kcnIBQPdVdQFzLsfjwlfhOiScH0eMZ8VOlm/VyfanNbzsVLuOLSmq";

@injectable()
export class AuthService {
	constructor(
		private readonly _userRepository: UserRepository,
		private readonly _emailVerificationRepository: EmailVerificationRepository,
		private readonly _forgotPasswordRepository: ForgotPasswordRepository,
		private readonly _authMailService: AuthMailService,
		private readonly _sessionService: SessionService,
	) {}

	/**
	 * The password is checked before any account state, and an unknown email and a wrong password
	 * get the same answer, so an unauthenticated caller cannot learn whether an address is
	 * registered, unverified, or inactive without already knowing its password.
	 */
	async login(email: string, password: string): Promise<UserInformation> {
		const user = await this._userRepository.findByEmail(email);
		const isPasswordValid = await Hash.compareHash(
			password,
			user?.password ?? DUMMY_PASSWORD_HASH,
		);

		if (!user || !isPasswordValid) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "email", message: t("auth.invalidCredentials") },
			]);
		}

		if (user.email_verified_at === null) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "email", message: t("auth.emailNotVerified") },
			]);
		}

		if (user.status !== "active") {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "email", message: t("auth.accountInactive") },
			]);
		}

		await this._sessionService.forgetUsers([user.id]);
		const information = await this._sessionService.getUserInformation(user.id);
		if (!information) {
			throw new UnauthorizedError(t("auth.userNotFound"));
		}

		logger.info({ userId: user.id }, "User logged in");
		return information;
	}

	async register(payload: {
		name: string;
		email: string;
		password: string;
	}): Promise<void> {
		const existing = await this._userRepository.findLiveByEmail(payload.email);
		if (existing) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{ field: "email", message: t("auth.emailAlreadyRegistered") },
			]);
		}

		const hashedPassword = await Hash.generateHash(payload.password);
		const { user, token } = await db.transaction(async (tx) => {
			const created = await this._userRepository.create(
				{
					name: payload.name,
					email: payload.email,
					password: hashedPassword,
					status: "active",
					remark: null,
					roleIds: [],
				},
				tx,
			);
			const verificationToken =
				await this._authMailService.issueVerificationToken(created.id, tx);
			return { user: created, token: verificationToken };
		});

		await this._authMailService.queueVerificationEmail(user, token);
	}

	async resendVerification(email: string): Promise<void> {
		const user = await this._userRepository.findByEmail(email);
		if (!user || user.email_verified_at !== null) {
			return;
		}

		const token = await db.transaction(
			async (tx) =>
				await this._authMailService.issueVerificationToken(user.id, tx),
		);
		await this._authMailService.queueVerificationEmail(user, token);
	}

	async verifyEmail(token: string): Promise<void> {
		const record = await this._emailVerificationRepository.findByToken(token);
		if (!record || record.expired_at < new Date() || record.used_at !== null) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "token", message: t("auth.invalidVerificationToken") },
			]);
		}

		await db.transaction(async (tx) => {
			await this._userRepository.markEmailVerified(record.user_id, tx);
			await this._emailVerificationRepository.spendAllForUser(
				record.user_id,
				tx,
			);
		});

		logger.info({ userId: record.user_id }, "Email verified");
	}

	async forgotPassword(email: string): Promise<void> {
		const user = await this._userRepository.findByEmail(email);
		if (!user) {
			return;
		}

		const token = await db.transaction(
			async (tx) => await this._authMailService.issueResetToken(user.id, tx),
		);
		await this._authMailService.queueResetPasswordEmail(user, token);
	}

	async resetPassword(token: string, newPassword: string): Promise<void> {
		const record = await this._forgotPasswordRepository.findByToken(token);
		if (!record || record.expired_at < new Date() || record.used_at !== null) {
			throw new BadRequestError(t("auth.validationError"), [
				{ field: "token", message: t("auth.invalidResetToken") },
			]);
		}

		const hashedPassword = await Hash.generateHash(newPassword);
		await db.transaction(async (tx) => {
			await this._userRepository.updatePassword(
				record.user_id,
				hashedPassword,
				tx,
			);
			await this._forgotPasswordRepository.spendAllForUser(record.user_id, tx);
		});

		await this._sessionService.revokeSessions(record.user_id);
		logger.info({ userId: record.user_id }, "Password reset");
	}

	/**
	 * Access and refresh tokens are signed with different secrets and carry a `type` claim; the
	 * auth plugin accepts only `type: "access"` and refresh accepts only `type: "refresh"`. The
	 * refresh token's `jti` is stored per user, so issuing a pair rotates out the previous one.
	 */
	async issueTokens(jwt: JWT, userId: string): Promise<TokenPair> {
		const jti = StrToolkit.random(32);
		const accessPayload: AccessTokenPayload = { id: userId, type: "access" };
		const refreshPayload: RefreshTokenPayload = {
			id: userId,
			type: "refresh",
			jti,
		};

		const accessToken = jwt.sign(accessPayload, {
			key: JwtConfig.ACCESS_SECRET,
			expiresIn: JwtConfig.ACCESS_EXPIRES_IN,
		});
		const refreshToken = jwt.sign(refreshPayload, {
			key: JwtConfig.REFRESH_SECRET,
			expiresIn: JwtConfig.REFRESH_EXPIRES_IN,
		});

		await Cache.set(
			RefreshTokenCacheKey(userId),
			jti,
			JwtConfig.REFRESH_EXPIRES_IN_SECONDS,
		);

		return { accessToken, refreshToken };
	}

	async refresh(jwt: JWT, refreshToken: string): Promise<TokenPair> {
		let payload: Partial<RefreshTokenPayload>;
		try {
			payload = jwt.verify<Partial<RefreshTokenPayload>>(refreshToken, {
				key: JwtConfig.REFRESH_SECRET,
			});
		} catch {
			throw new UnauthorizedError(t("auth.invalidRefreshToken"));
		}

		if (payload.type !== "refresh" || !payload.id || !payload.jti) {
			throw new UnauthorizedError(t("auth.invalidRefreshToken"));
		}

		const storedJti = await Cache.get<string>(RefreshTokenCacheKey(payload.id));
		if (storedJti !== payload.jti) {
			throw new UnauthorizedError(t("auth.invalidRefreshToken"));
		}

		await this._sessionService.forgetUsers([payload.id]);
		const information = await this._sessionService.getUserInformation(
			payload.id,
		);
		if (!information) {
			await this._sessionService.revokeSessions(payload.id);
			throw new UnauthorizedError(t("auth.invalidRefreshToken"));
		}

		return await this.issueTokens(jwt, payload.id);
	}
}
