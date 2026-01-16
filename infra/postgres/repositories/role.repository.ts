import { db, role_permissionsTable, rolesTable } from "infra/postgres/index";
import { and, asc, desc, eq, ilike, ne, not, or, SQL } from "drizzle-orm";
import { defaultSort } from "@default/sort";
import { DatatableToolkit } from "@toolkit/datatable";
import { DbTransaction } from ".";
import { DatatableType, PaginationResponse, SortDirection } from "@packages";
import { NotFoundError, UnprocessableEntityError } from "@error/custom.errors";
import { injectable } from "tsyringe";

export type RoleList = {
	id: string;
	name: string;
	created_at: Date;
	updated_at: Date;
};

export type RoleDetail = {
	id: string;
	name: string;
	created_at: Date;
	updated_at: Date;
	permissions: {
		group: string;
		names: {
			id: string;
			name: string;
			is_assigned: boolean;
		}[];
	}[];
};

@injectable()
export class RoleRepository {
	private dbInstance = db;

	get db() {
		return this.dbInstance;
	}

	getDb(tx?: DbTransaction) {
		return tx || this.dbInstance.$cache;
	}

	async findAll(
		queryParam: DatatableType,
		tx?: DbTransaction,
	): Promise<PaginationResponse<RoleList>> {
		const database = tx || this.dbInstance;
		const page: number = queryParam.page || 1;
		const limit: number = queryParam.limit || 10;
		const search: string | null = queryParam.search || null;
		const orderBy: string = queryParam.sort ? queryParam.sort : defaultSort;
		const orderDirection: SortDirection = queryParam.sortDirection
			? queryParam.sortDirection
			: "desc";
		const filter: Record<string, boolean | string | Date> | null =
			queryParam.filter || null;
		const offset = (page - 1) * limit;
		let whereCondition: SQL | undefined;
		if (search) {
			whereCondition = or(ilike(rolesTable.name, `%${search}%`));
		}
		let filteredCondition: SQL | undefined = undefined;
		if (filter) {
			if (filter.name) {
				filteredCondition = and(
					whereCondition,
					ilike(rolesTable.name, `%${filter.name.toString()}%`),
				);
			}
		}
		const finalWhereCondition: SQL | undefined = and(
			whereCondition,
			filteredCondition,
		);
		const orderColumn = DatatableToolkit.parseSort(
			{
				id: rolesTable.id,
				name: rolesTable.name,
				createdAt: rolesTable.createdAt,
				updatedAt: rolesTable.updatedAt,
			},
			orderBy,
		);
		const roles = await database.query.roles.findMany({
			where: finalWhereCondition,
			orderBy: orderDirection === "asc" ? asc(orderColumn) : desc(orderColumn),
			columns: {
				id: true,
				name: true,
				createdAt: true,
				updatedAt: true,
			},
			limit,
			offset,
		});
		const totalCount = await database.$count(rolesTable, finalWhereCondition);
		return {
			data: roles.map((role) => ({
				id: role.id,
				name: role.name,
				created_at: role.createdAt,
				updated_at: role.updatedAt,
			})),
			meta: {
				page,
				limit,
				totalCount,
			},
		};
	}

	async create(
		data: {
			name: string;
			permissionIds?: string[];
		},
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;

		const isNameExists = await database.query.roles.findFirst({
			where: eq(rolesTable.name, data.name),
		});

		if (isNameExists) {
			throw new UnprocessableEntityError("Role name already exists", [
				{
					field: "name",
					message: `The role name for ${data.name} already exists`,
				},
			]);
		}

		const role = await database
			.insert(rolesTable)
			.values({
				name: data.name,
			})
			.returning({ id: rolesTable.id })
			.execute();

		if (data.permissionIds && data.permissionIds.length > 0) {
			const rolePermissions = data.permissionIds.map((permissionId) => ({
				roleId: role[0].id,
				permissionId,
			}));

			await database.insert(role_permissionsTable).values(rolePermissions);
		}
	}

	async getDetail(id: string, tx?: DbTransaction): Promise<RoleDetail> {
		const database = tx || this.dbInstance;

		const role = await database.query.roles.findFirst({
			where: eq(rolesTable.id, id),
			columns: {
				id: true,
				name: true,
				createdAt: true,
				updatedAt: true,
			},

			with: {
				role_permissions: {
					with: {
						permission: {
							columns: {
								id: true,
								name: true,
								group: true,
							},
						},
					},
				},
			},
		});

		if (!role) {
			throw new NotFoundError("Role not found");
		}

		const allPermissions = await database.query.permissions.findMany({
			columns: {
				id: true,
				name: true,
				group: true,
			},
		});

		return {
			id: role.id,
			name: role.name,
			created_at: role.createdAt,
			updated_at: role.updatedAt,
			permissions: allPermissions.reduce(
				(
					acc: {
						group: string;
						names: { id: string; name: string; is_assigned: boolean }[];
					}[],
					permission,
				) => {
					const isAssigned = role.role_permissions.some(
						(rp) => rp.permission.id === permission.id,
					);

					const group = permission.group || "Ungrouped";
					const nameEntry = {
						id: permission.id,
						name: permission.name,
						is_assigned: isAssigned,
					};

					const existingGroup = acc.find((g) => g.group === group);
					if (existingGroup) {
						existingGroup.names.push(nameEntry);
					} else {
						acc.push({ group, names: [nameEntry] });
					}

					return acc;
				},
				[],
			),
		};
	}

	async update(
		id: string,
		data: { name: string; permissionIds?: string[] },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;

		const role = await database.query.roles.findFirst({
			where: eq(rolesTable.id, id),
		});

		if (!role) {
			throw new NotFoundError("Role not found");
		}

		const isNameExists = await database.query.roles.findFirst({
			where: and(eq(rolesTable.name, data.name), not(eq(rolesTable.id, id))),
		});

		if (isNameExists) {
			throw new UnprocessableEntityError("Role name already exists", [
				{
					field: "name",
					message: `The role name for ${data.name} already exists`,
				},
			]);
		}

		await database
			.update(rolesTable)
			.set({
				name: data.name,
			})
			.where(eq(rolesTable.id, id))
			.execute();

		await database
			.delete(role_permissionsTable)
			.where(eq(role_permissionsTable.roleId, id))
			.execute();

		if (data.permissionIds && data.permissionIds.length > 0) {
			const rolePermissions = data.permissionIds.map((permissionId) => ({
				roleId: id,
				permissionId,
			}));

			await database.insert(role_permissionsTable).values(rolePermissions);
		}
	}

	async delete(id: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;

		const role = await database.query.roles.findFirst({
			where: eq(rolesTable.id, id),
		});

		if (!role) {
			throw new NotFoundError("Role not found");
		}

		await database
			.delete(role_permissionsTable)
			.where(eq(role_permissionsTable.roleId, id))
			.execute();

		await database.delete(rolesTable).where(eq(rolesTable.id, id)).execute();
	}

	async selectOptions(): Promise<{ id: string; name: string }[]> {
		const roles = await this.dbInstance.query.roles.findMany({
			where: ne(rolesTable.name, "superuser"),
			columns: {
				id: true,
				name: true,
			},
			orderBy: asc(rolesTable.name),
		});

		return roles;
	}
}
