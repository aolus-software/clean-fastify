import { z } from "zod";

export const SelectPermissionResponseSchema = z.array(
	z.object({
		group: z.string().describe("Permission group"),
		permissions: z.array(
			z.object({
				id: z.string().describe("Permission ID"),
				name: z.string().describe("Permission name"),
				group: z.string().describe("Permission group"),
			}),
		),
	}),
);

export const SelectRoleResponseSchema = z.array(
	z.object({
		id: z.string().describe("Role ID"),
		name: z.string().describe("Role name"),
	}),
);
