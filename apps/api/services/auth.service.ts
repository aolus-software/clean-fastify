import { Hash } from "@security/hash";
import { UnprocessableEntityError } from "../error/custom.errors";
import { ForgotPasswordRepository, UserRepository } from "../repositories";
import { UserInformation } from "../types/UserInformation";
import { usersTable } from "@postgres/user";
import {
	db,
	email_verificationsTable,
	password_reset_tokensTable,
} from "@postgres/index";
import { and, eq, isNull } from "drizzle-orm";
import { StrToolkit } from "@toolkit/string";
import { verificationTokenLifetime } from "@default/token-lifetime";
import { AppConfig } from "config/app.config";
import { sendEmailQueue } from "@app/worker/queue/send-email.queue";

export const AuthService = {
	login: async (email: string, password: string): Promise<UserInformation> => {
		const user = await UserRepository().findByEmail(email);

		if (user.email_verified_at === null) {
			// await userActivitiesService.trackActivity({
			// 	user_id: user.id,
			// 	action: "failed_login",
			// 	resource: "auth/login",
			// 	ip_address: ipAddress,
			// 	metadata: { reason: "email not verified" },
			// 	user_agent: userAgent,
			// });

			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Email not verified",
				},
			]);
		}

		if (user.status !== "active") {
			// await userActivitiesService.trackActivity({
			// 	user_id: user.id,
			// 	action: "failed_login",
			// 	resource: "auth/login",
			// 	ip_address: ipAddress,
			// 	metadata: { reason: "account not active" },
			// 	user_agent: userAgent,
			// });

			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Your account is not active. Please contact administrator.",
				},
			]);
		}

		const isPasswordValid = await Hash.compareHash(password, user.password);
		if (!isPasswordValid) {
			// await userActivitiesService.trackActivity({
			// 	user_id: user.id,
			// 	action: "failed_login",
			// 	resource: "auth/login",
			// 	ip_address: ipAddress,
			// 	metadata: { reason: "invalid password" },
			// 	user_agent: userAgent,
			// });

			throw new UnprocessableEntityError("Validation error", [
				{
					field: "email",
					message: "Invalid email or password",
				},
			]);
		}

		// // Track successful login
		// await userActivitiesService.trackActivity({
		// 	user_id: user.id,
		// 	action: "login",
		// 	resource: "auth/login",
		// 	ip_address: ipAddress,
		// 	metadata: { status: "success" },
		// 	user_agent: userAgent,
		// });

		return await UserRepository().UserInformation(user.id);
	},

	register: async (payload: {
		name: string;
		email: string;
		password: string;
	}): Promise<void> => {
		const user = await UserRepository().db.query.users.findFirst({
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

		// Hash the password
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

			// // Track registration activity
			// await UserActivitiesService.trackActivity({
			// 	user_id: newUser[0].id,
			// 	action: "register",
			// 	resource: "user",
			// 	ip_address: context?.ipAddress || "",
			// 	user_agent: context?.userAgent || "",
			// 	metadata: {
			// 		email: payload.email,
			// 		name: payload.name,
			// 	},
			// });
		});
	},

	resendVerification: async (payload: { email: string }): Promise<void> => {
		const user = await UserRepository().findByEmail(payload.email);
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

			// Track resend verification activity
			// await userActivitiesService.trackActivity({
			// 	user_id: user.id,
			// 	action: "resend_verification",
			// 	resource: "email_verification",
			// 	ip_address: context?.ipAddress || "",
			// 	user_agent: context?.userAgent || "",
			// 	metadata: {
			// 		email: payload.email,
			// 	},
			// });
		});
	},

	verifyEmail: async (payload: { token: string }): Promise<void> => {
		const verificationRecord = await db
			.select()
			.from(email_verificationsTable)
			.where(eq(email_verificationsTable.token, payload.token))
			.limit(1)
			.then((res) => res[0]);

		if (!verificationRecord) {
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
				.where(eq(usersTable.id, verificationRecord.user_id));

			await trx
				.delete(email_verificationsTable)
				.where(eq(email_verificationsTable.id, verificationRecord.id));

			// // Track email verification activity
			// await userActivitiesService.trackActivity({
			// 	user_id: verificationRecord.user_id,
			// 	action: "verify_email",
			// 	resource: "email_verification",
			// 	ip_address: context?.ipAddress || "",
			// 	user_agent: context?.userAgent || "",
			// 	metadata: {
			// 		token_id: verificationRecord.id.toString(),
			// 	},
			// });
		});
	},

	async forgotPassword(email: string): Promise<void> {
		const user = await UserRepository().db.query.users.findFirst({
			where: eq(usersTable.email, email),
		});
		if (!user) {
			return;
		}

		const token = StrToolkit.random(255);
		await ForgotPasswordRepository().create({
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

		// // Track forgot password activity
		// await userActivitiesService.trackActivity({
		// 	user_id: user.id,
		// 	action: "request_password_reset",
		// 	resource: "password_reset",
		// 	ip_address: context?.ipAddress || "",
		// 	user_agent: context?.userAgent || "",
		// 	metadata: {
		// 		email,
		// 	},
		// });
	},

	async resetPassword(token: string, newPassword: string): Promise<void> {
		const passwordReset = await ForgotPasswordRepository().findByToken(token);
		if (!passwordReset) {
			throw new UnprocessableEntityError("Validation error", [
				{
					field: "token",
					message: "Invalid or expired password reset token",
				},
			]);
		}

		const user = await UserRepository().db.query.users.findFirst({
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

			// Track password reset activity
			// await userActivitiesService.trackActivity({
			// 	user_id: user.id,
			// 	action: "reset_password",
			// 	resource: "password_reset",
			// 	ip_address: context?.ipAddress || "",
			// 	user_agent: context?.userAgent || "",
			// 	metadata: {
			// 		token_id: passwordReset.id.toString(),
			// 	},
			// });
		});
	},
};
