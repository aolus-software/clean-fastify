import { StrongPassword } from "@default/strong-password";
import { ResponseToolkit } from "@toolkit/response";
import vine from "@vinejs/vine";
import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../services";

const AuthSchema = {
	LoginSchema: vine.object({
		email: vine.string().email().normalizeEmail(),
		password: vine.string().minLength(1),
	}),

	RegisterSchema: vine.object({
		email: vine.string().email().normalizeEmail().maxLength(255),
		name: vine.string().trim().minLength(1).maxLength(255),
		password: vine.string().regex(StrongPassword),
	}),

	VerifyEmailSchema: vine.object({
		token: vine.string().trim().minLength(1).maxLength(255),
	}),

	ResentVerificationEmailSchema: vine.object({
		email: vine.string().email().normalizeEmail().maxLength(255),
	}),

	ForgotPasswordSchema: vine.object({
		email: vine.string().email().normalizeEmail().maxLength(255),
	}),

	ResetPasswordSchema: vine.object({
		token: vine.string().trim().minLength(1).maxLength(255),
		password: vine.string().regex(StrongPassword).confirmed(),
	}),
};

export const AuthHandler = {
	login: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: AuthSchema.LoginSchema,
			data: payload,
		});

		const service = await AuthService.login(
			validation.email,
			validation.password,
		);
		const token = await _reply.jwtSign({
			id: service.id,
		});

		return ResponseToolkit.success(_reply, {
			message: "Login successful",
			data: { token, user: service },
		});
	},

	register: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: AuthSchema.RegisterSchema,
			data: payload,
		});

		await AuthService.register({
			name: validation.name,
			email: validation.email,
			password: validation.password,
		});

		return ResponseToolkit.success(_reply, {
			message: "Registration successful. Please verify your email.",
		});
	},

	verifyEmail: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: AuthSchema.VerifyEmailSchema,
			data: payload,
		});

		await AuthService.verifyEmail({
			token: validation.token,
		});

		return ResponseToolkit.success(_reply, {
			message: "Email verified successfully.",
		});
	},

	resentVerificationEmail: async (
		_request: FastifyRequest,
		_reply: FastifyReply,
	) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: AuthSchema.ResentVerificationEmailSchema,
			data: payload,
		});

		await AuthService.resendVerification({
			email: validation.email,
		});

		return ResponseToolkit.success(_reply, {
			message: "Verification email resent successfully.",
		});
	},

	forgotPassword: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: AuthSchema.ForgotPasswordSchema,
			data: payload,
		});

		await AuthService.forgotPassword(validation.email);

		return ResponseToolkit.success(_reply, {
			message: "Password reset email sent successfully.",
		});
	},

	resetPassword: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: AuthSchema.ResetPasswordSchema,
			data: payload,
		});

		await AuthService.resetPassword(validation.token, validation.password);

		return ResponseToolkit.success(_reply, {
			message: "Success reset your password",
		});
	},
};
