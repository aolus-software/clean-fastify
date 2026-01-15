import { z } from "zod";

export const PermissionSchema = z.object({
	id: z.string(),
	name: z.string(),
	group: z.string(),
	created_at: z.date(),
	updated_at: z.date(),
});

export const CreatePermissionSchema = z.object({
	name: z.array(z.string()).nonempty().describe("Array of permission names"),
	group: z.string().describe("Permission group"),
});

export const UpdatePermissionSchema = z.object({
	name: z.string().min(3).max(100).describe("Permission name"),
	group: z.string().min(3).max(100).describe("Permission group"),
});
