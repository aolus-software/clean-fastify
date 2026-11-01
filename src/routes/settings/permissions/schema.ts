import {
	permissionFilterableFields,
	permissionFilterExample,
	permissionSearchColumns,
	permissionSortableFields,
} from "@database";
import { buildDatatableQueryParamsSchema } from "@utils";
import { z } from "zod";

export const PermissionQuerySchema = buildDatatableQueryParamsSchema({
	sortFields: permissionSortableFields,
	filterFields: permissionFilterableFields,
	filterExample: permissionFilterExample,
	searchColumns: permissionSearchColumns,
});

export const PermissionIdParamsSchema = z.object({
	id: z.uuid().describe("Permission ID"),
});

export const PermissionListSchema = z.object({
	id: z.uuid().describe("Permission ID"),
	name: z.string().describe("Permission name, '<group> <action>'"),
	group: z.string().describe("Permission group"),
	createdAt: z.date().describe("Created at"),
	updatedAt: z.date().describe("Updated at"),
});

export const PermissionCreateSchema = z.object({
	name: z
		.array(z.string().min(1).max(255))
		.min(1)
		.describe("Actions to create; each is stored as '<group> <action>'"),
	group: z.string().min(1).max(100).describe("Permission group"),
});

export const PermissionUpdateSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(255)
		.describe("Full permission name, stored verbatim, e.g. 'user list'"),
	group: z.string().min(1).max(100).describe("Permission group"),
});
