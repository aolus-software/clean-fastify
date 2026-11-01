import { SortDirection } from "./sort-direction";

export type DatatableType = {
	page: number;
	perPage: number;
	search?: string;
	sort: string;
	sortDirection: SortDirection;
	filter?: Record<string, boolean | string>;
};

/**
 * How a repository reads a comma in a filter value: `id` and `list` split into an `IN`, `date`
 * reads `start,end` as an inclusive range. Omitted means plain text, where a comma is literal.
 */
export type FilterFieldKind = "id" | "list" | "date";

export type FilterField =
	| string
	| { field: string; enum: readonly string[]; kind?: FilterFieldKind }
	| { field: string; kind: FilterFieldKind };

export const filterFieldNames = (fields: readonly FilterField[]): string[] =>
	fields.map((f) => (typeof f === "string" ? f : f.field));
