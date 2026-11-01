import { BadRequestError, defaultSort, paginationLength } from "@fastify-libs";
import { t } from "@i18n";
import { DatatableType, FilterField, SortDirection } from "@types";
import { PgColumn } from "drizzle-orm/pg-core";
import { FastifyRequest } from "fastify";

import { DateToolkit } from "../date";

type ListQuery = {
	page?: number;
	perPage?: number;
	search?: string;
	sort?: string;
	sortDirection?: SortDirection;
};

export class DatatableToolkit {
	/**
	 * Builds `DatatableType` from a list route's validated query. `filter[<key>]` parameters are
	 * read off the raw URL: the Zod query schema cannot name bracketed keys and strips them, so
	 * `request.query` never carries a filter. Values stay strings; the repository interprets them.
	 */
	static parseFilter(request: FastifyRequest): DatatableType {
		const query = request.query as ListQuery;
		const filter: Record<string, boolean | string> = {};

		for (const [key, value] of new URL(request.url, "http://localhost")
			.searchParams) {
			if (!key.startsWith("filter[") || !key.endsWith("]")) continue;
			const filterKey = key.slice(7, -1);
			if (!filterKey) continue;
			if (value === "true") filter[filterKey] = true;
			else if (value === "false") filter[filterKey] = false;
			else filter[filterKey] = value;
		}

		return {
			page: query.page ?? 1,
			perPage: query.perPage ?? paginationLength,
			search: query.search || undefined,
			sort: query.sort ?? defaultSort,
			sortDirection: query.sortDirection ?? "desc",
			filter: Object.keys(filter).length > 0 ? filter : undefined,
		};
	}

	static parseSort(
		orderableColumns: Record<string, PgColumn>,
		orderBy: string,
	): PgColumn {
		const column: PgColumn | undefined = orderableColumns[orderBy];
		if (!column) {
			throw new BadRequestError(t("validation.failed"), [
				{
					field: "sort",
					message: t("datatable.sortNotAllowed", {
						field: orderBy,
						allowed: Object.keys(orderableColumns).join(", "),
					}),
				},
			]);
		}
		return column;
	}

	static assertFilter(
		filter: Record<string, boolean | string> | undefined,
		fields: readonly FilterField[],
	): void {
		if (!filter) return;

		const allowed = fields.map((f) => (typeof f === "string" ? f : f.field));
		const unknownKeys = Object.keys(filter).filter(
			(key) => !allowed.includes(key),
		);
		if (unknownKeys.length > 0) {
			throw new BadRequestError(
				t("validation.failed"),
				unknownKeys.map((key) => ({
					field: `filter[${key}]`,
					message: t("datatable.filterNotAllowed", {
						field: key,
						allowed: allowed.join(", "),
					}),
				})),
			);
		}

		for (const field of fields) {
			if (typeof field === "string" || !("enum" in field)) continue;
			const raw = filter[field.field];
			if (raw === undefined) continue;
			const invalid = DatatableToolkit.filterValues(raw).filter(
				(value) => !field.enum.includes(value),
			);
			if (invalid.length > 0) {
				throw new BadRequestError(t("validation.failed"), [
					{
						field: `filter[${field.field}]`,
						message: t("datatable.filterValueNotAllowed", {
							allowed: field.enum.join(", "),
							received: invalid.join(", "),
						}),
					},
				]);
			}
		}
	}

	static filterValues(value: boolean | string): string[] {
		return value
			.toString()
			.split(",")
			.map((part) => part.trim())
			.filter((part) => part.length > 0);
	}

	/**
	 * A single date matches that whole day in APP_TIMEZONE; `start,end` spans start-of-first-day
	 * to end-of-last-day. Anything unparseable is a 400, never an Invalid Date reaching the driver.
	 */
	static filterDateRange(
		value: boolean | string,
		field: string,
	): { from: Date; to: Date } {
		const invalid = (): BadRequestError =>
			new BadRequestError(t("validation.failed"), [
				{
					field: `filter[${field}]`,
					message: t("datatable.filterDateInvalid"),
				},
			]);

		const parts = DatatableToolkit.filterValues(value);
		if (parts.length === 0 || parts.length > 2) throw invalid();

		const parsed = parts.map((part) => {
			if (!DateToolkit.isValid(part)) throw invalid();
			const date = DateToolkit.parse(part);
			if (!date.isValid()) throw invalid();
			return date;
		});

		const from = DateToolkit.startOfDay(parsed[0]).toDate();
		const to = DateToolkit.endOfDay(parsed[parsed.length - 1]).toDate();
		if (from > to) throw invalid();

		return { from, to };
	}
}
