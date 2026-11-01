import { defaultSort, paginationLength } from "@fastify-libs";
import { FilterField } from "@types";
import { z, ZodTypeAny } from "zod";

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
	itemSchema: T,
	statusCode: number = 200,
) {
	return createSuccessResponseSchema(
		z.object({
			data: z.array(itemSchema).describe("Rows on this page"),
			meta: z.object({
				page: z.number().describe("Current page number"),
				limit: z.number().describe("Rows per page"),
				totalCount: z.number().describe("Total number of matching rows"),
			}),
		}),
		statusCode,
	);
}

export const UserInformationSchema = z.object({
	id: z.uuid().describe("User ID"),
	name: z.string().describe("User name"),
	email: z.string().describe("User email"),
	roles: z.array(z.string()).describe("Role names"),
	permissions: z
		.array(z.string())
		.describe("Permission names granted through the user's roles"),
});

export const NullSuccessResponseSchema = createSuccessResponseSchema(z.null());
export const NullCreatedResponseSchema = createSuccessResponseSchema(
	z.null(),
	201,
);

type DatatableQueryOptions = {
	sortFields: readonly string[];
	filterFields: readonly FilterField[];
	filterExample?: Readonly<Record<string, string>>;
	searchColumns: readonly string[];
};

/**
 * The list-route query schema, documented against the repository's own allow-lists so the
 * advertised values and the enforced ones are the same arrays. `sort` and `sortDirection` are
 * closed enums (422 on anything else). The `filter` object is documentation only: filters travel
 * as flat `filter[<key>]=<value>` parameters that this schema strips, and the repository enforces
 * them (400 on an unknown key or value).
 */
export function buildDatatableQueryParamsSchema({
	sortFields,
	filterFields,
	filterExample = {},
	searchColumns,
}: DatatableQueryOptions) {
	const commaNote = (field: FilterField): string => {
		if (typeof field === "string") return "";
		if ("enum" in field) {
			return ` One of: ${field.enum.join(", ")}. Comma-separate for several.`;
		}
		if (field.kind === "date") {
			return " A single date matches that whole day; pass start,end for a range.";
		}
		return " Comma-separate for several values.";
	};

	const filterSchema = z
		.object(
			Object.fromEntries(
				filterFields.map((field) => {
					const name = typeof field === "string" ? field : field.field;
					const example =
						typeof field !== "string" && "enum" in field
							? field.enum[0]
							: (filterExample[name] ?? "value");
					return [
						name,
						z
							.string()
							.optional()
							.describe(
								`Sent as filter[${name}]=${example}.${commaNote(field)}`,
							),
					];
				}),
			),
		)
		.optional()
		.describe(
			`Filters, sent as separate query parameters filter[<key>]=<value>, not as JSON. Allowed keys: ${filterFields
				.map((f) => (typeof f === "string" ? f : f.field))
				.join(", ")}. Any other key is rejected with 400.`,
		);

	return z.object({
		page: z.coerce.number().int().min(1).default(1).describe("Page number"),
		perPage: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.default(paginationLength)
			.describe(`Rows per page (default ${paginationLength}, max 100)`),
		search: z
			.string()
			.optional()
			.describe(`Case-insensitive search over: ${searchColumns.join(", ")}`),
		sort: z
			.enum(sortFields as [string, ...string[]])
			.default(defaultSort)
			.describe(`Sort field. Allowed: ${sortFields.join(", ")}`),
		sortDirection: z
			.enum(["asc", "desc"])
			.default("desc")
			.describe("Sort direction"),
		filter: filterSchema,
	});
}

const FieldErrorsSchema = z
	.array(
		z.object({
			field: z.string().describe("Field the error refers to"),
			message: z.string().describe("Error message"),
		}),
	)
	.describe("Field errors");

export function createErrorResponseSchema(statusCode: number) {
	return z.object({
		status: z.number().default(statusCode).describe("HTTP status code"),
		success: z.boolean().default(false).describe("Request success"),
		message: z.string().describe("Error message"),
		data: z.null(),
	});
}

export function createValidationErrorResponseSchema(statusCode: number = 422) {
	return z.object({
		status: z.number().default(statusCode).describe("HTTP status code"),
		success: z.boolean().default(false).describe("Request success"),
		message: z.string().describe("Error message"),
		errors: FieldErrorsSchema,
	});
}

export const UnauthorizedResponseSchema = createErrorResponseSchema(401);
export const ForbiddenResponseSchema = createErrorResponseSchema(403);
export const NotFoundResponseSchema = createErrorResponseSchema(404);
export const ServerErrorResponseSchema = createErrorResponseSchema(500);
export const ServiceUnavailableResponseSchema = createErrorResponseSchema(503);
export const ValidationErrorResponseSchema =
	createValidationErrorResponseSchema(422);
export const BadRequestResponseSchema = z.object({
	status: z.number().default(400).describe("HTTP status code"),
	success: z.boolean().default(false).describe("Request success"),
	message: z.string().describe("Error message"),
	errors: FieldErrorsSchema.optional(),
	data: z.null().optional(),
});
