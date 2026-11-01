import { sendEmailQueue } from "@bull/queue/send-email.queue";
import { AppConfig } from "@config";
import {
	DbTransaction,
	EmailVerificationRepository,
	ForgotPasswordRepository,
} from "@database";
import {
	resetPasswordLifetime,
	verificationTokenLifetime,
} from "@fastify-libs";
import { getCurrentLocale, t } from "@i18n";
import { logger, StrToolkit } from "@utils";
import { injectable } from "tsyringe";

type MailRecipient = { id: string; name: string; email: string };

/**
 * Mints single-use tokens and queues the auth mails. Issuing a token spends every earlier unused
 * one for the same user, so only the newest link works. Minting accepts `tx` so it can join the
 * caller's transaction; queueing is a separate call made after that transaction commits, so a
 * rolled-back write never sends a mail for a token that does not exist.
 */
@injectable()
export class AuthMailService {
	constructor(
		private readonly _emailVerificationRepository: EmailVerificationRepository,
		private readonly _forgotPasswordRepository: ForgotPasswordRepository,
	) {}

	async issueVerificationToken(
		userId: string,
		tx?: DbTransaction,
	): Promise<string> {
		const token = StrToolkit.random(100);
		await this._emailVerificationRepository.spendAllForUser(userId, tx);
		await this._emailVerificationRepository.create(
			{ user_id: userId, token, expired_at: verificationTokenLifetime() },
			tx,
		);
		return token;
	}

	async issueResetToken(userId: string, tx?: DbTransaction): Promise<string> {
		const token = StrToolkit.random(255);
		await this._forgotPasswordRepository.spendAllForUser(userId, tx);
		await this._forgotPasswordRepository.create(
			{ user_id: userId, token, expired_at: resetPasswordLifetime() },
			tx,
		);
		return token;
	}

	async queueVerificationEmail(
		user: MailRecipient,
		token: string,
	): Promise<void> {
		await sendEmailQueue.add("send-email", {
			subject: t("mail.subject.verification"),
			to: user.email,
			template: "/auth/email-verification",
			lang: getCurrentLocale(),
			variables: {
				user_id: user.id,
				user_name: user.name,
				user_email: user.email,
				verification_url: `${AppConfig.CLIENT_URL}/auth/verify-email?token=${token}`,
			},
		});
		logger.info({ userId: user.id }, "Verification email queued");
	}

	async queueResetPasswordEmail(
		user: MailRecipient,
		token: string,
	): Promise<void> {
		await sendEmailQueue.add("send-email", {
			subject: t("mail.subject.resetPassword"),
			to: user.email,
			template: "/auth/forgot-password",
			lang: getCurrentLocale(),
			variables: {
				user_id: user.id,
				user_name: user.name,
				user_email: user.email,
				reset_password_url: `${AppConfig.CLIENT_URL}/auth/reset-password?token=${token}`,
			},
		});
		logger.info({ userId: user.id }, "Reset password email queued");
	}
}
