import { z } from "zod";

export const RoleResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	created_at: z.date(),
	updated_at: z.date(),
});

export const CreateRoleSchema = z.object({
	name: z.string().min(3).max(50),
	permission_ids: z.array(z.string().uuid()).optional(),
});

export const UpdateRoleSchema = z.object({
	name: z.string().min(3).max(50).optional(),
	permission_ids: z.array(z.string().uuid()).optional(),
});

export const RoleDetailResponseSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	created_at: z.date(),
	updated_at: z.date(),
	permissions: z.array(
		z.object({
			group: z.string().nullable(),
			names: z.array(
				z.object({
					id: z.uuid(),
					name: z.string(),
					is_assigned: z.boolean(),
				}),
			),
		}),
	),
});
