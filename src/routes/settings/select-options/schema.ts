import { z } from "zod";

export const SelectPermissionSchema = z.array(
	z.object({
		group: z.string().describe("Permission group"),
		permissions: z.array(
			z.object({
				id: z.uuid().describe("Permission ID"),
				name: z.string().describe("Permission name"),
				group: z.string().describe("Permission group"),
			}),
		),
	}),
);

export const SelectRoleSchema = z.array(
	z.object({
		id: z.uuid().describe("Role ID"),
		name: z.string().describe("Role name"),
	}),
);
