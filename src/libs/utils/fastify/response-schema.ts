import { z, ZodTypeAny } from "zod";

/**
 * Creates a success response schema with custom data type
 * @param dataSchema - Zod schema for the data field
 * @param statusCode - HTTP status code (default: 200)
 */
export function createSuccessResponseSchema<T extends ZodTypeAny>(
	dataSchema: T,
	statusCode: number = 200,
) {
	return z.object({
		status: z.number().default(statusCode).describe("HTTP status code"),
		success: z.boolean().default(true).describe("Request success"),
		message: z.string().describe("Success message"),
		data: dataSchema,
	});
}

export function createSuccessPaginationResponseSchema<T extends ZodTypeAny>(
	dataSchema: T,
	statusCode: number = 200,
) {
	return z.object({
		status: z.number().default(statusCode).describe("HTTP status code"),
		success: z.boolean().default(true).describe("Request success"),
		message: z.string().describe("Success message"),
		data: z.object({
			data: z.array(dataSchema).describe("Array of data items"),
			meta: z.object({
				page: z.number().describe("Current page number"),
				limit: z.number().describe("Number of items per page"),
				totalCount: z.number().describe("Total number of items"),
			}),
		}),
	});
}

export function createSuccessKeySetPaginationResponseSchema<
	T extends ZodTypeAny,
>(dataSchema: T, statusCode: number = 200) {
	return z.object({
		status: z.number().default(statusCode).describe("HTTP status code"),
		success: z.boolean().default(true).describe("Request success"),
		message: z.string().describe("Success message"),
		data: z.object({
			data: z.array(dataSchema).describe("Array of data items"),
			meta: z.object({
				page: z.number().describe("Current page number"),
				limit: z.number().describe("Number of items per page"),
				totalCount: z.number().describe("Total number of items"),
				nextCursor: z.string().nullable().describe("Cursor for the next page"),
				previousCursor: z
					.string()
					.nullable()
					.describe("Cursor for the previous page"),
			}),
		}),
	});
}

export function buildDatatableQueryParamsSchema(
	allowableSort: string[] = [],
	allowableFilter: string[] = [],
) {
	const filterSchema = allowableFilter.length
		? z.object(
				Object.fromEntries(
					allowableFilter.map((key) => [
						key,
						z.union([z.string(), z.boolean(), z.coerce.date()]).optional(),
					]),
				),
			)
		: z.record(z.string(), z.union([z.string(), z.boolean(), z.coerce.date()]));

	return z.object({
		page: z.coerce.number().min(1).default(1).describe("Page number"),
		limit: z.coerce
			.number()
			.min(1)
			.max(100)
			.default(10)
			.describe("Items per page"),
		search: z.string().optional().describe("Search query"),
		sort: z
			.string()
			.default("created_at")
			.describe(
				"Sort field" +
					(allowableSort.length
						? ` (allowed: ${allowableSort.join(", ")})`
						: ""),
			),
		sortDirection: z
			.enum(["asc", "desc"])
			.default("desc")
			.describe("Sort direction"),
		"filter[*]": filterSchema.optional().describe("Filter conditions"),
	});
}

/**
 * Creates an error response schema
 * @param statusCode - HTTP status code
 */
export function createErrorResponseSchema(statusCode: number) {
	return z.object({
		status: z.number().default(statusCode).describe("HTTP status code"),
		success: z.boolean().default(false).describe("Request success"),
		message: z.string().describe("Error message"),
	});
}

/**
 * Creates a validation error response schema (422)
 */
export function createValidationErrorResponseSchema() {
	return z.object({
		status: z.number().default(422).describe("HTTP status code"),
		success: z.boolean().default(false).describe("Request success"),
		message: z.string().describe("Error message"),
		errors: z
			.array(
				z.record(
					z.string().describe("Field name"),
					z.string().describe("Error message"),
				),
			)
			.describe("Validation errors"),
	});
}

// Pre-built common response schemas
export const UnauthorizedResponseSchema = createErrorResponseSchema(401);
export const ForbiddenResponseSchema = createErrorResponseSchema(403);
export const NotFoundResponseSchema = createErrorResponseSchema(404);
export const ValidationErrorResponseSchema =
	createValidationErrorResponseSchema();
export const ServerErrorResponseSchema = createErrorResponseSchema(500);
export const BadRequestResponseSchema = createErrorResponseSchema(400);

// Empty data success response helper
export const EmptySuccessResponseSchema = createSuccessResponseSchema(
	z.object({}),
);
