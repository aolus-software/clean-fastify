import {
	db,
	permissionsTable,
	role_permissionsTable,
	rolesTable,
} from "@database";
import { injectable } from "@fastify-libs";
import {
	DatatableType,
	FilterField,
	PaginationResponse,
	RoleDetail,
	RoleList,
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
	SQL,
} from "drizzle-orm";

import { DbTransaction } from ".";

const roleOrderableColumns = {
	id: rolesTable.id,
	name: rolesTable.name,
	createdAt: rolesTable.created_at,
	updatedAt: rolesTable.updated_at,
};

export const roleSortableFields = Object.keys(roleOrderableColumns);
export const roleSearchColumns = ["name"];
export const roleFilterableFields: FilterField[] = [
	"name",
	{ field: "createdAt", kind: "date" },
	{ field: "updatedAt", kind: "date" },
];
export const roleFilterExample: Record<string, string> = {
	name: "admin",
	createdAt: "2024-01-01,2024-12-31",
	updatedAt: "2024-01-01,2024-12-31",
};

@injectable()
export class RoleRepository {
	private dbInstance = db;

	async findAll(
		queryParam: DatatableType,
		tx?: DbTransaction,
	): Promise<PaginationResponse<RoleList>> {
		const database = tx || this.dbInstance;
		const { page, perPage: limit, search, filter } = queryParam;
		const offset = (page - 1) * limit;

		DatatableToolkit.assertFilter(filter, roleFilterableFields);
		const orderColumn = DatatableToolkit.parseSort(
			roleOrderableColumns,
			queryParam.sort,
		);

		const clauses: (SQL | undefined)[] = [];
		if (search) {
			clauses.push(ilike(rolesTable.name, `%${search}%`));
		}
		if (filter) {
			if (filter.name !== undefined) {
				clauses.push(ilike(rolesTable.name, `%${filter.name.toString()}%`));
			}
			if (filter.createdAt !== undefined) {
				const { from, to } = DatatableToolkit.filterDateRange(
					filter.createdAt,
					"createdAt",
				);
				clauses.push(
					gte(rolesTable.created_at, from),
					lte(rolesTable.created_at, to),
				);
			}
			if (filter.updatedAt !== undefined) {
				const { from, to } = DatatableToolkit.filterDateRange(
					filter.updatedAt,
					"updatedAt",
				);
				clauses.push(
					gte(rolesTable.updated_at, from),
					lte(rolesTable.updated_at, to),
				);
			}
		}

		const where = and(...clauses);

		const [rows, totalCount] = await Promise.all([
			database.query.roles.findMany({
				where,
				orderBy:
					queryParam.sortDirection === "asc"
						? asc(orderColumn)
						: desc(orderColumn),
				limit,
				offset,
			}),
			database.$count(rolesTable, where),
		]);

		return {
			data: rows.map((role) => ({
				id: role.id,
				name: role.name,
				createdAt: role.created_at,
				updatedAt: role.updated_at,
			})),
			meta: { page, limit, totalCount },
		};
	}

	async findById(
		id: string,
		tx?: DbTransaction,
	): Promise<{ id: string; name: string } | null> {
		const database = tx || this.dbInstance;
		const role = await database.query.roles.findFirst({
			where: eq(rolesTable.id, id),
			columns: { id: true, name: true },
		});
		return role ?? null;
	}

	async findByName(
		name: string,
		excludeId?: string,
		tx?: DbTransaction,
	): Promise<{ id: string } | null> {
		const database = tx || this.dbInstance;
		const role = await database.query.roles.findFirst({
			where: and(
				eq(rolesTable.name, name),
				excludeId ? ne(rolesTable.id, excludeId) : undefined,
			),
			columns: { id: true },
		});
		return role ?? null;
	}

	async countExisting(ids: string[], tx?: DbTransaction): Promise<number> {
		if (ids.length === 0) return 0;
		const database = tx || this.dbInstance;
		return await database.$count(rolesTable, inArray(rolesTable.id, ids));
	}

	async create(
		data: { name: string; permissionIds: string[] },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		const [role] = await database
			.insert(rolesTable)
			.values({ name: data.name })
			.returning({ id: rolesTable.id });

		if (data.permissionIds.length > 0) {
			await database.insert(role_permissionsTable).values(
				data.permissionIds.map((permissionId) => ({
					roleId: role.id,
					permissionId,
				})),
			);
		}
	}

	async getDetail(id: string, tx?: DbTransaction): Promise<RoleDetail | null> {
		const database = tx || this.dbInstance;
		const role = await database.query.roles.findFirst({
			where: eq(rolesTable.id, id),
			with: { role_permissions: { columns: { permissionId: true } } },
		});

		if (!role) return null;

		const assigned = new Set(
			role.role_permissions.map(
				(rolePermission) => rolePermission.permissionId,
			),
		);
		const allPermissions = await database.query.permissions.findMany({
			columns: { id: true, name: true, group: true },
			orderBy: [asc(permissionsTable.group), asc(permissionsTable.name)],
		});

		const groups = new Map<string, RoleDetail["permissions"][number]>();
		for (const permission of allPermissions) {
			const group = groups.get(permission.group) ?? {
				group: permission.group,
				names: [],
			};
			group.names.push({
				id: permission.id,
				name: permission.name,
				isAssigned: assigned.has(permission.id),
			});
			groups.set(permission.group, group);
		}

		return {
			id: role.id,
			name: role.name,
			createdAt: role.created_at,
			updatedAt: role.updated_at,
			permissions: [...groups.values()],
		};
	}

	async update(
		id: string,
		data: { name: string; permissionIds: string[] },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(rolesTable)
			.set({ name: data.name })
			.where(eq(rolesTable.id, id));

		await database
			.delete(role_permissionsTable)
			.where(eq(role_permissionsTable.roleId, id));

		if (data.permissionIds.length > 0) {
			await database.insert(role_permissionsTable).values(
				data.permissionIds.map((permissionId) => ({
					roleId: id,
					permissionId,
				})),
			);
		}
	}

	async delete(id: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;
		await database.delete(rolesTable).where(eq(rolesTable.id, id));
	}

	async selectOptions(): Promise<{ id: string; name: string }[]> {
		return await this.dbInstance.query.roles.findMany({
			where: ne(rolesTable.name, "superuser"),
			columns: { id: true, name: true },
			orderBy: asc(rolesTable.name),
		});
	}
}
