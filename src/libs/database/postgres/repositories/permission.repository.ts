import { db, permissionsTable } from "@database";
import { NotFoundError, UnprocessableEntityError } from "@fastify-libs";
import {
	DatatableType,
	PaginationResponse,
	PermissionList,
	PermissionSelectOptions,
	SortDirection,
} from "@types";
import { and, asc, desc, eq, ilike, not, or, SQL } from "drizzle-orm";
import { injectable } from "tsyringe";

import { defaultSort } from "@/libs/fastify/default/sort";

import { DbTransaction } from ".";

@injectable()
export class PermissionRepository {
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
	): Promise<PaginationResponse<PermissionList>> {
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
			whereCondition = or(
				ilike(permissionsTable.name, `%${search}%`),
				ilike(permissionsTable.group, `%${search}%`),
			);
		}

		let filteredCondition: SQL | undefined = undefined;
		if (filter) {
			if (filter.name) {
				filteredCondition = and(
					whereCondition,
					ilike(permissionsTable.name, `%${filter.name.toString()}%`),
				);
			}

			if (filter.group) {
				filteredCondition = and(
					whereCondition,
					ilike(permissionsTable.group, `%${filter.group.toString()}%`),
				);
			}
		}

		const finalWhereCondition: SQL | undefined = and(
			whereCondition,
			filteredCondition ? filteredCondition : undefined,
		);

		const validateOrderBy = {
			id: permissionsTable.id,
			name: permissionsTable.name,
			group: permissionsTable.group,
			created_at: permissionsTable.created_at,
			updated_at: permissionsTable.updated_at,
		};

		type OrderableKey = keyof typeof validateOrderBy;
		const normalizedOrderBy: OrderableKey = (
			Object.keys(validateOrderBy) as OrderableKey[]
		).includes(orderBy as OrderableKey)
			? (orderBy as OrderableKey)
			: ("id" as OrderableKey);

		const orderColumn = validateOrderBy[normalizedOrderBy];

		const rawData = await database.query.permissions.findMany({
			where: finalWhereCondition,
			orderBy: orderDirection === "asc" ? asc(orderColumn) : desc(orderColumn),
			columns: {
				id: true,
				name: true,
				group: true,
				created_at: true,
				updated_at: true,
			},
			limit,
			offset,
		});

		const data: PermissionList[] = rawData.map((item) => ({
			id: item.id,
			name: item.name,
			group: item.group,
			created_at: item.created_at,
			updated_at: item.updated_at,
		}));

		const totalCount = await database.$count(
			permissionsTable,
			finalWhereCondition,
		);

		return {
			data,
			meta: {
				page,
				limit,
				totalCount,
			},
		};
	}

	async getDetail(id: string, tx?: DbTransaction): Promise<PermissionList> {
		const database = tx || this.dbInstance;
		const permission = await database.query.permissions.findFirst({
			where: and(eq(permissionsTable.id, id)),
			columns: {
				id: true,
				name: true,
				group: true,
				created_at: true,
				updated_at: true,
			},
		});

		if (!permission) {
			throw new NotFoundError("Permission not found");
		}

		return {
			id: permission.id,
			name: permission.name,
			group: permission.group,
			created_at: permission.created_at,
			updated_at: permission.updated_at,
		};
	}

	async create(
		data: { name: string[]; group: string },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		const permissionNames: string[] = data.name.map(
			(name) => `${data.group} ${name}`,
		);

		const existingPermissions = await database.query.permissions.findMany({
			where: or(
				...permissionNames.map((name) => ilike(permissionsTable.name, name)),
			),
		});

		if (existingPermissions.length > 0) {
			throw new UnprocessableEntityError("Some permission already exists", [
				{
					field: "name",
					message: `Some permission is already exist ${existingPermissions
						.map((perm) => perm.name)
						.join(", ")}`,
				},
			]);
		}

		const insertedData = data.name.map((name) => ({
			name: `${data.group} ${name}`,
			group: data.group,
		}));

		await database.insert(permissionsTable).values(insertedData);
	}

	async update(
		id: string,
		data: { name: string; group: string },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		const permission = await database.query.permissions.findFirst({
			where: eq(permissionsTable.id, id),
		});

		if (!permission) {
			throw new NotFoundError("Permission not found");
		}

		const isPermissionNameAlreadyExist = await database
			.select()
			.from(permissionsTable)
			.where(
				and(
					eq(permissionsTable.name, data.name),
					not(eq(permissionsTable.id, id)),
				),
			)
			.limit(1);

		if (isPermissionNameAlreadyExist.length > 0) {
			throw new UnprocessableEntityError("Permission name already exists", [
				{
					field: "name",
					message: "Permission name already exists",
				},
			]);
		}

		await database
			.update(permissionsTable)
			.set({
				name: data.name,
				group: data.group,
			})
			.where(eq(permissionsTable.id, id));
	}

	async delete(id: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;
		const permission = await database.query.permissions.findFirst({
			where: eq(permissionsTable.id, id),
		});

		if (!permission) {
			throw new NotFoundError("Permission not found");
		}

		await database.delete(permissionsTable).where(eq(permissionsTable.id, id));
	}

	async selectOptions(tx?: DbTransaction): Promise<PermissionSelectOptions[]> {
		const database = tx || this.dbInstance;
		const dataPermissions = await database.query.permissions.findMany({
			columns: { id: true, name: true, group: true },
		});
		const grouped: Record<string, PermissionSelectOptions["permissions"]> = {};
		dataPermissions.forEach((perm) => {
			if (!grouped[perm.group]) grouped[perm.group] = [];
			grouped[perm.group].push(perm);
		});
		return Object.entries(grouped).map(([group, permissions]) => ({
			group,
			permissions,
		}));
	}
}
