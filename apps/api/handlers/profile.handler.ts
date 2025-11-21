import { ResponseToolkit } from "@toolkit/response";
import { FastifyReply, FastifyRequest } from "fastify";
import { UserInformation } from "../types/UserInformation";
import vine from "@vinejs/vine";
import { ProfileService } from "../services/profile.service";
import { StrongPassword } from "@default/strong-password";

const ProfileSchema = {
	updateProfileSchema: vine.object({
		name: vine.string().trim().minLength(1).maxLength(255),
		email: vine.string().email().normalizeEmail().maxLength(255),
	}),

	updatePasswordSchema: vine.object({
		currentPassword: vine.string().minLength(1),
		password: vine.string().regex(StrongPassword).confirmed(),
	}),
};

export const ProfileHandler = {
	profile: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const user = _request.user as UserInformation;
		// await _request.server.clearUserCache(user.id);
		return ResponseToolkit.success(_reply, {
			message: "Profile fetched successfully.",
			data: user,
		});
	},

	updateProfile: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: ProfileSchema.updateProfileSchema,
			data: payload,
		});

		const data = await ProfileService.updateProfile(
			(_request.user as UserInformation).id,
			{
				name: validation.name,
				email: validation.email,
			},
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		await _request.server.clearUserCache((_request.user as UserInformation).id);

		return ResponseToolkit.success<UserInformation>(
			_reply,
			data,
			"Profile updated successfully.",
			200,
		);
	},

	updatePassword: async (_request: FastifyRequest, _reply: FastifyReply) => {
		const payload = _request.body;
		const validation = await vine.validate({
			schema: ProfileSchema.updatePasswordSchema,
			data: payload,
		});

		await ProfileService.updatePassword((_request.user as UserInformation).id, {
			currentPassword: validation.currentPassword,
			password: validation.password,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		await _request.server.clearUserCache((_request.user as UserInformation).id);

		return ResponseToolkit.success(
			_reply,
			{},
			"Password updated successfully.",
			200,
		);
	},
};
