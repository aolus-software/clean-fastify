import { t } from "@i18n";
import { ProfileService } from "@services";
import {
	createSuccessResponseSchema,
	NullSuccessResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
	UserInformationSchema,
	ValidationErrorResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { UpdatePasswordBodySchema, UpdateProfileBodySchema } from "./schema";

const ProfileResponseSchema = createSuccessResponseSchema(
	UserInformationSchema,
);

export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.addHook("onRequest", async (request) => {
		await request.authenticate();
	});

	// ======================
	// GET: /profile
	// ======================
	app.get(
		"",
		{
			schema: {
				tags: ["Profile"],
				summary: "Get own profile",
				description: "The caller's own identity, roles and permissions.",
				security: [{ BearerAuth: [] }],
				response: {
					200: ProfileResponseSchema,
					401: UnauthorizedResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			return ResponseToolkit.success(
				reply,
				request.userInformation,
				t("profile.retrieved"),
			);
		},
	);

	// ======================
	// PATCH: /profile
	// ======================
	app.patch(
		"",
		{
			schema: {
				tags: ["Profile"],
				summary: "Update own profile",
				description:
					"Update the caller's name and email. An email held by another live user is a 422.",
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
			const user = await fastify.di
				.resolve(ProfileService)
				.updateProfile(request.userInformation.id, request.body);
			return ResponseToolkit.success(reply, user, t("profile.updated"));
		},
	);

	// ======================
	// PATCH: /profile/password
	// ======================
	app.patch(
		"/password",
		{
			schema: {
				tags: ["Profile"],
				summary: "Change own password",
				description:
					"Change the caller's password after checking the current one. Ends the caller's sessions, so a new login is needed.",
				security: [{ BearerAuth: [] }],
				body: UpdatePasswordBodySchema,
				response: {
					200: NullSuccessResponseSchema,
					401: UnauthorizedResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			await fastify.di
				.resolve(ProfileService)
				.updatePassword(request.userInformation.id, request.body);
			return ResponseToolkit.success(reply, null, t("profile.passwordUpdated"));
		},
	);
}
