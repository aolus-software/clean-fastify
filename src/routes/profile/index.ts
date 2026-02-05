import { FastifyInstance } from "fastify";
import { ProfileService } from "@services";
import { ResponseToolkit } from "@utils";
import { UserInformation } from "@types";
import {
	UpdateProfileBodySchema,
	UpdatePasswordBodySchema,
	ProfileResponseSchema,
	SuccessResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
	ServerErrorResponseSchema,
} from "./schema";

export default function (fastify: FastifyInstance) {
	// Apply authentication to all routes in this module using autohook
	fastify.addHook("onRequest", async (request, reply) => {
		await request.authenticate(reply);
	});

	// ======================
	// GET: /profile
	// ======================
	fastify.get(
		"",
		{
			schema: {
				tags: ["Profile"],
				description: "Get authenticated user's profile information.",
				security: [{ BearerAuth: [] }],
				response: {
					200: ProfileResponseSchema,
					401: UnauthorizedResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const userInfo = request.userInformation;

			return ResponseToolkit.success<UserInformation>(
				reply,
				userInfo,
				"Profile retrieved successfully",
				200,
			);
		},
	);

	// ======================
	// PUT: /profile
	// ======================
	fastify.put(
		"",
		{
			schema: {
				tags: ["Profile"],
				description: "Update authenticated user's profile information.",
				security: [{ BearerAuth: [] }],
				body: UpdateProfileBodySchema,
				response: {
					200: ProfileResponseSchema,
					401: UnauthorizedResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const userId = request.userInformation.id;
			const { name, email } = request.body as {
				name: string;
				email: string;
			};
			const service: ProfileService = fastify.di.resolve(ProfileService);
			const updatedUser = await service.updateProfile(userId, {
				name,
				email,
			});

			return ResponseToolkit.success<UserInformation>(
				reply,
				updatedUser,
				"Profile updated successfully",
				200,
			);
		},
	);

	// ======================
	// PATCH: /profile/password
	// ======================
	fastify.patch(
		"/password",
		{
			schema: {
				tags: ["Profile"],
				description: "Update authenticated user's password.",
				security: [{ BearerAuth: [] }],
				body: UpdatePasswordBodySchema,
				response: {
					200: SuccessResponseSchema,
					401: UnauthorizedResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const userId = request.userInformation.id;
			const { currentPassword, password } = request.body as {
				currentPassword: string;
				password: string;
			};

			const service: ProfileService = fastify.di.resolve(ProfileService);
			await service.updatePassword(userId, {
				currentPassword,
				password,
			});

			return ResponseToolkit.success(
				reply,
				{},
				"Password updated successfully",
				200,
			);
		},
	);
}
