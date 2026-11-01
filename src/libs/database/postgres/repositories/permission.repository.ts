import { db, permissionsTable } from "@database";
import { injectable } from "@fastify-libs";
import {
	DatatableType,
	FilterField,
	PaginationResponse,
	PermissionList,
	PermissionSelectOptions,
} from "@types";
import { DatatableToolkit } from "@utils";
import {
	and,
	asc,
	desc,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	ne,
	or,
	SQL,
} from "drizzle-orm";

import { DbTransaction } from ".";

const permissionOrderableColumns = {
	id: permissionsTable.id,
	name: permissionsTable.name,
	group: permissionsTable.group,
	createdAt: permissionsTable.created_at,
	updatedAt: permissionsTable.updated_at,
};

export const permissionSortableFields = Object.keys(permissionOrderableColumns);
export const permissionSearchColumns = ["name", "group"];
export const permissionFilterableFields: FilterField[] = [
	"name",
	"group",
	{ field: "createdAt", kind: "date" },
	{ field: "updatedAt", kind: "date" },
];
export const permissionFilterExample: Record<string, string> = {
	name: "user list",
	group: "user",
	createdAt: "2024-01-01,2024-12-31",
	updatedAt: "2024-01-01,2024-12-31",
};

const toPermissionList = (
	row: typeof permissionsTable.$inferSelect,
): PermissionList => ({
	id: row.id,
	name: row.name,
	group: row.group,
	createdAt: row.created_at,
	updatedAt: row.updated_at,
});

@injectable()
export class PermissionRepository {
	private dbInstance = db;

	async findAll(
		queryParam: DatatableType,
		tx?: DbTransaction,
	): Promise<PaginationResponse<PermissionList>> {
		const database = tx || this.dbInstance;
		const { page, perPage: limit, search, filter } = queryParam;
		const offset = (page - 1) * limit;

		DatatableToolkit.assertFilter(filter, permissionFilterableFields);
		const orderColumn = DatatableToolkit.parseSort(
			permissionOrderableColumns,
			queryParam.sort,
		);

		const clauses: (SQL | undefined)[] = [];
		if (search) {
			clauses.push(
				or(
					ilike(permissionsTable.name, `%${search}%`),
					ilike(permissionsTable.group, `%${search}%`),
				),
			);
		}
		if (filter) {
			if (filter.name !== undefined) {
				clauses.push(
					ilike(permissionsTable.name, `%${filter.name.toString()}%`),
				);
			}
			if (filter.group !== undefined) {
				clauses.push(
					ilike(permissionsTable.group, `%${filter.group.toString()}%`),
				);
			}
			if (filter.createdAt !== undefined) {
				const { from, to } = DatatableToolkit.filterDateRange(
					filter.createdAt,
					"createdAt",
				);
				clauses.push(
					gte(permissionsTable.created_at, from),
					lte(permissionsTable.created_at, to),
				);
			}
			if (filter.updatedAt !== undefined) {
				const { from, to } = DatatableToolkit.filterDateRange(
					filter.updatedAt,
					"updatedAt",
				);
				clauses.push(
					gte(permissionsTable.updated_at, from),
					lte(permissionsTable.updated_at, to),
				);
			}
		}

		const where = and(...clauses);

		const [rows, totalCount] = await Promise.all([
			database.query.permissions.findMany({
				where,
				orderBy:
					queryParam.sortDirection === "asc"
						? asc(orderColumn)
						: desc(orderColumn),
				limit,
				offset,
			}),
			database.$count(permissionsTable, where),
		]);

		return {
			data: rows.map(toPermissionList),
			meta: { page, limit, totalCount },
		};
	}

	async findById(
		id: string,
		tx?: DbTransaction,
	): Promise<PermissionList | null> {
		const database = tx || this.dbInstance;
		const row = await database.query.permissions.findFirst({
			where: eq(permissionsTable.id, id),
		});
		return row ? toPermissionList(row) : null;
	}

	async findByName(
		name: string,
		excludeId?: string,
		tx?: DbTransaction,
	): Promise<{ id: string } | null> {
		const database = tx || this.dbInstance;
		const row = await database.query.permissions.findFirst({
			where: and(
				eq(permissionsTable.name, name),
				excludeId ? ne(permissionsTable.id, excludeId) : undefined,
			),
			columns: { id: true },
		});
		return row ?? null;
	}

	async findExistingByNames(
		names: string[],
		tx?: DbTransaction,
	): Promise<string[]> {
		if (names.length === 0) return [];
		const database = tx || this.dbInstance;
		const rows = await database.query.permissions.findMany({
			where: inArray(permissionsTable.name, names),
			columns: { name: true },
		});
		return rows.map((row) => row.name);
	}

	async countExisting(ids: string[], tx?: DbTransaction): Promise<number> {
		if (ids.length === 0) return 0;
		const database = tx || this.dbInstance;
		return await database.$count(
			permissionsTable,
			inArray(permissionsTable.id, ids),
		);
	}

	async createMany(
		rows: { name: string; group: string }[],
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database.insert(permissionsTable).values(rows);
	}

	async update(
		id: string,
		data: { name: string; group: string },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(permissionsTable)
			.set(data)
			.where(eq(permissionsTable.id, id));
	}

	async delete(id: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;
		await database.delete(permissionsTable).where(eq(permissionsTable.id, id));
	}

	async selectOptions(): Promise<PermissionSelectOptions[]> {
		const rows = await this.dbInstance.query.permissions.findMany({
			columns: { id: true, name: true, group: true },
			orderBy: [asc(permissionsTable.group), asc(permissionsTable.name)],
		});
		const grouped = new Map<string, PermissionSelectOptions["permissions"]>();
		for (const row of rows) {
			grouped.set(row.group, [...(grouped.get(row.group) ?? []), row]);
		}
		return [...grouped.entries()].map(([group, permissions]) => ({
			group,
			permissions,
		}));
	}
}
