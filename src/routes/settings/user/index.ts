import { UserService } from "@services";
import {
	BadRequestResponseSchema,
	buildDatatableQueryParamsSchema,
	createSuccessPaginationResponseSchema,
	DatatableToolkit,
	ForbiddenResponseSchema,
	NotFoundResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import {
	ChangeUserPasswordSchema,
	CreateUserSchema,
	UpdateUserSchema,
	UserDetailResponseSchema,
	UserResponseSchema,
} from "./schema";

export default function (fastify: FastifyInstance) {
	// apply authentication to all routes in this module using autohook
	fastify.addHook("onRequest", async (request, reply) => {
		await request.authenticate(reply);
	});

	// ======================
	// GET: /settings/user
	// ======================
	fastify.get(
		"/",
		{
			schema: {
				tags: ["Settings/User"],
				summary: "Get list of users",
				description: "Retrieve a paginated list of users.",
				querystring: buildDatatableQueryParamsSchema(
					["id", "name", "email", "created_at", "updated_at"],
					["name", "email", "created_at", "updated_at"],
				),
				security: [{ BearerAuth: [] }],
				response: {
					200: createSuccessPaginationResponseSchema(UserResponseSchema),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const queryParams = DatatableToolkit.parseFilter(request);
			const service = fastify.di.resolve(UserService);
			const data = await service.findAll(queryParams);

			return ResponseToolkit.success(reply, data, "Users fetched", 200);
		},
	);

	// =======================
	// POST: /settings/user
	// ======================
	fastify.post(
		"/",
		{
			schema: {
				tags: ["Settings/User"],
				summary: "Create a new user",
				description: "Create a new user with the provided details.",
				security: [{ BearerAuth: [] }],
				body: CreateUserSchema,
				response: {
					201: createSuccessPaginationResponseSchema(z.object({}), 201),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const service = fastify.di.resolve(UserService);
			await service.create(request.body as z.infer<typeof CreateUserSchema>);

			return ResponseToolkit.success(reply, {}, "User created", 201);
		},
	);

	// =======================
	// GET: /settings/user/:userId
	// =======================
	fastify.get(
		"/:userId",
		{
			schema: {
				tags: ["Settings/User"],
				summary: "Get user detail by ID",
				description:
					"Retrieve detailed information about a specific user by their ID.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					userId: z.string().uuid(),
				}),
				response: {
					200: createSuccessPaginationResponseSchema(UserDetailResponseSchema),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { userId } = request.params as { userId: string };
			const service = fastify.di.resolve(UserService);
			const data = await service.detail(userId);

			return ResponseToolkit.success(reply, data, "User detail fetched");
		},
	);

	// =======================
	// PUT: /settings/user/:userId
	// =======================
	fastify.put(
		"/:userId",
		{
			schema: {
				tags: ["Settings/User"],
				summary: "Update user by ID",
				description: "Update the details of an existing user by their ID.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					userId: z.uuid(),
				}),
				body: UpdateUserSchema,
				response: {
					200: createSuccessPaginationResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { userId } = request.params as { userId: string };
			const service = fastify.di.resolve(UserService);
			await service.update(
				userId,
				request.body as z.infer<typeof UpdateUserSchema>,
			);

			return ResponseToolkit.success(reply, {}, "User updated", 200);
		},
	);

	// =======================
	// DELETE: /settings/user/:userId
	// =======================
	fastify.delete(
		"/:userId",
		{
			schema: {
				tags: ["Settings/User"],
				summary: "Delete user by ID",
				description: "Delete a user from the system by their ID.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					userId: z.uuid(),
				}),
				response: {
					200: createSuccessPaginationResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { userId } = request.params as { userId: string };
			const service = fastify.di.resolve(UserService);
			await service.delete(userId);

			return ResponseToolkit.success(reply, {}, "User deleted", 200);
		},
	);

	// =======================
	// PATCH: /settings/user/:userId/change-password
	// =======================
	fastify.patch(
		"/:userId/change-password",
		{
			schema: {
				tags: ["Settings/User"],
				summary: "Change user password by ID",
				description: "Change the password of an existing user by their ID.",
				security: [{ BearerAuth: [] }],
				params: z.object({
					userId: z.uuid(),
				}),
				body: ChangeUserPasswordSchema,
				response: {
					200: createSuccessPaginationResponseSchema(z.object({})),
					400: BadRequestResponseSchema,
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { userId } = request.params as { userId: string };
			const body = request.body as z.infer<typeof ChangeUserPasswordSchema>;
			const service = fastify.di.resolve(UserService);
			await service.resetPassword(userId, { password: body.password });

			return ResponseToolkit.success(reply, {}, "Password changed", 200);
		},
	);
}
