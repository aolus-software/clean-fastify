import {
	roleFilterableFields,
	roleFilterExample,
	roleSearchColumns,
	roleSortableFields,
} from "@database";
import { buildDatatableQueryParamsSchema } from "@utils";
import { z } from "zod";

export const RoleQuerySchema = buildDatatableQueryParamsSchema({
	sortFields: roleSortableFields,
	filterFields: roleFilterableFields,
	filterExample: roleFilterExample,
	searchColumns: roleSearchColumns,
});

export const RoleIdParamsSchema = z.object({
	id: z.uuid().describe("Role ID"),
});

export const RoleListSchema = z.object({
	id: z.uuid().describe("Role ID"),
	name: z.string().describe("Role name"),
	createdAt: z.date().describe("Created at"),
	updatedAt: z.date().describe("Updated at"),
});

export const RoleDetailSchema = RoleListSchema.extend({
	permissions: z
		.array(
			z.object({
				group: z.string().describe("Permission group"),
				names: z.array(
					z.object({
						id: z.uuid().describe("Permission ID"),
						name: z.string().describe("Permission name"),
						isAssigned: z.boolean().describe("Whether this role holds it"),
					}),
				),
			}),
		)
		.describe("Every permission in the system, grouped, marked for this role"),
});

export const RoleCreateSchema = z.object({
	name: z.string().min(1).max(100).describe("Role name, unique"),
	permissionIds: z.array(z.uuid()).describe("IDs of the permissions to grant"),
});

export const RoleUpdateSchema = RoleCreateSchema;
