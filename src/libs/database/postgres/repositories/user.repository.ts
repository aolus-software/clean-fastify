import {
	db,
	role_permissionsTable,
	user_rolesTable,
	usersTable,
	UserStatus,
	UserStatusEnum,
} from "@database";
import { injectable } from "@fastify-libs";
import {
	DatatableType,
	FilterField,
	PaginationResponse,
	UserCreate,
	UserDetail,
	UserForAuth,
	UserInformation,
	UserList,
	UserUpdate,
} from "@types";
import { DatatableToolkit } from "@utils";
import {
	and,
	asc,
	desc,
	eq,
	exists,
	gte,
	ilike,
	inArray,
	isNull,
	lte,
	ne,
	or,
	SQL,
	sql,
} from "drizzle-orm";

import { DbTransaction } from ".";

const userOrderableColumns = {
	id: usersTable.id,
	name: usersTable.name,
	email: usersTable.email,
	status: usersTable.status,
	createdAt: usersTable.created_at,
	updatedAt: usersTable.updated_at,
};

export const userSortableFields = Object.keys(userOrderableColumns);
export const userSearchColumns = ["name", "email", "status"];
export const userFilterableFields: FilterField[] = [
	{ field: "status", enum: Object.values(UserStatus) },
	"name",
	"email",
	{ field: "roleId", kind: "id" },
	{ field: "createdAt", kind: "date" },
	{ field: "updatedAt", kind: "date" },
];
export const userFilterExample: Record<string, string> = {
	name: "jane",
	email: "jane@example.com",
	roleId: "550e8400-e29b-41d4-a716-446655440000",
	createdAt: "2024-01-01,2024-12-31",
	updatedAt: "2024-01-01,2024-12-31",
};

@injectable()
export class UserRepository {
	private dbInstance = db;

	async findAll(
		queryParam: DatatableType,
		tx?: DbTransaction,
	): Promise<PaginationResponse<UserList>> {
		const database = tx || this.dbInstance;
		const { page, perPage: limit, search, filter } = queryParam;
		const offset = (page - 1) * limit;

		DatatableToolkit.assertFilter(filter, userFilterableFields);
		const orderColumn = DatatableToolkit.parseSort(
			userOrderableColumns,
			queryParam.sort,
		);

		const clauses: (SQL | undefined)[] = [isNull(usersTable.deleted_at)];
		if (search) {
			clauses.push(
				or(
					ilike(usersTable.name, `%${search}%`),
					ilike(usersTable.email, `%${search}%`),
					ilike(sql`${usersTable.status}::text`, `%${search}%`),
				),
			);
		}

		if (filter) {
			if (filter.status !== undefined) {
				clauses.push(
					inArray(
						usersTable.status,
						DatatableToolkit.filterValues(filter.status) as UserStatusEnum[],
					),
				);
			}
			if (filter.name !== undefined) {
				clauses.push(ilike(usersTable.name, `%${filter.name.toString()}%`));
			}
			if (filter.email !== undefined) {
				clauses.push(ilike(usersTable.email, `%${filter.email.toString()}%`));
			}
			if (filter.roleId !== undefined) {
				clauses.push(
					exists(
						database
							.select({ userId: user_rolesTable.userId })
							.from(user_rolesTable)
							.where(
								and(
									eq(user_rolesTable.userId, usersTable.id),
									inArray(
										user_rolesTable.roleId,
										DatatableToolkit.filterValues(filter.roleId),
									),
								),
							),
					),
				);
			}
			if (filter.createdAt !== undefined) {
				const { from, to } = DatatableToolkit.filterDateRange(
					filter.createdAt,
					"createdAt",
				);
				clauses.push(
					gte(usersTable.created_at, from),
					lte(usersTable.created_at, to),
				);
			}
			if (filter.updatedAt !== undefined) {
				const { from, to } = DatatableToolkit.filterDateRange(
					filter.updatedAt,
					"updatedAt",
				);
				clauses.push(
					gte(usersTable.updated_at, from),
					lte(usersTable.updated_at, to),
				);
			}
		}

		const where = and(...clauses);

		const [rows, totalCount] = await Promise.all([
			database.query.users.findMany({
				where,
				orderBy:
					queryParam.sortDirection === "asc"
						? asc(orderColumn)
						: desc(orderColumn),
				limit,
				offset,
				columns: {
					id: true,
					name: true,
					email: true,
					status: true,
					remark: true,
					created_at: true,
					updated_at: true,
				},
				with: {
					user_roles: {
						columns: {},
						with: { role: { columns: { name: true } } },
					},
				},
			}),
			database.$count(usersTable, where),
		]);

		return {
			data: rows.map((user) => ({
				id: user.id,
				name: user.name,
				email: user.email,
				status: user.status,
				remark: user.remark,
				roles: user.user_roles.map((userRole) => userRole.role.name),
				createdAt: user.created_at,
				updatedAt: user.updated_at,
			})),
			meta: { page, limit, totalCount },
		};
	}

	async findById(
		id: string,
		tx?: DbTransaction,
	): Promise<{ id: string; status: UserStatusEnum } | null> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(eq(usersTable.id, id), isNull(usersTable.deleted_at)),
			columns: { id: true, status: true },
		});
		return user ?? null;
	}

	async findLiveByEmail(
		email: string,
		excludeId?: string,
		tx?: DbTransaction,
	): Promise<{ id: string } | null> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(
				eq(usersTable.email, email),
				isNull(usersTable.deleted_at),
				excludeId ? ne(usersTable.id, excludeId) : undefined,
			),
			columns: { id: true },
		});
		return user ?? null;
	}

	async findByEmail(
		email: string,
		tx?: DbTransaction,
	): Promise<UserForAuth | null> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(eq(usersTable.email, email), isNull(usersTable.deleted_at)),
			columns: {
				id: true,
				name: true,
				email: true,
				password: true,
				status: true,
				email_verified_at: true,
			},
		});
		return user ?? null;
	}

	async findForMail(
		id: string,
		tx?: DbTransaction,
	): Promise<{ id: string; name: string; email: string } | null> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(eq(usersTable.id, id), isNull(usersTable.deleted_at)),
			columns: { id: true, name: true, email: true },
		});
		return user ?? null;
	}

	async findPasswordHash(
		id: string,
		tx?: DbTransaction,
	): Promise<string | null> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(eq(usersTable.id, id), isNull(usersTable.deleted_at)),
			columns: { password: true },
		});
		return user?.password ?? null;
	}

	async create(
		data: UserCreate,
		tx?: DbTransaction,
	): Promise<{ id: string; name: string; email: string }> {
		const database = tx || this.dbInstance;
		const [user] = await database
			.insert(usersTable)
			.values({
				name: data.name,
				email: data.email,
				password: data.password,
				status: data.status,
				remark: data.remark,
			})
			.returning({
				id: usersTable.id,
				name: usersTable.name,
				email: usersTable.email,
			});

		if (data.roleIds.length > 0) {
			await database
				.insert(user_rolesTable)
				.values(data.roleIds.map((roleId) => ({ userId: user.id, roleId })));
		}

		return user;
	}

	async getDetail(id: string, tx?: DbTransaction): Promise<UserDetail | null> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(eq(usersTable.id, id), isNull(usersTable.deleted_at)),
			columns: {
				id: true,
				name: true,
				email: true,
				status: true,
				remark: true,
				created_at: true,
				updated_at: true,
			},
			with: {
				user_roles: {
					columns: {},
					with: { role: { columns: { id: true, name: true } } },
				},
			},
		});

		if (!user) return null;

		return {
			id: user.id,
			name: user.name,
			email: user.email,
			status: user.status,
			remark: user.remark,
			roles: user.user_roles.map((userRole) => ({
				id: userRole.role.id,
				name: userRole.role.name,
			})),
			createdAt: user.created_at,
			updatedAt: user.updated_at,
		};
	}

	async update(
		id: string,
		data: UserUpdate,
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(usersTable)
			.set({
				name: data.name,
				email: data.email,
				status: data.status,
				remark: data.remark,
			})
			.where(eq(usersTable.id, id));

		await database
			.delete(user_rolesTable)
			.where(eq(user_rolesTable.userId, id));

		if (data.roleIds.length > 0) {
			await database
				.insert(user_rolesTable)
				.values(data.roleIds.map((roleId) => ({ userId: id, roleId })));
		}
	}

	async updateProfile(
		id: string,
		data: { name: string; email: string },
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database.update(usersTable).set(data).where(eq(usersTable.id, id));
	}

	async updatePassword(
		id: string,
		passwordHash: string,
		tx?: DbTransaction,
	): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(usersTable)
			.set({ password: passwordHash })
			.where(eq(usersTable.id, id));
	}

	async markEmailVerified(id: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(usersTable)
			.set({ email_verified_at: new Date() })
			.where(eq(usersTable.id, id));
	}

	async delete(id: string, tx?: DbTransaction): Promise<void> {
		const database = tx || this.dbInstance;
		await database
			.update(usersTable)
			.set({ deleted_at: new Date() })
			.where(eq(usersTable.id, id));
	}

	async findIdsByRole(roleId: string, tx?: DbTransaction): Promise<string[]> {
		const database = tx || this.dbInstance;
		const rows = await database
			.select({ userId: user_rolesTable.userId })
			.from(user_rolesTable)
			.where(eq(user_rolesTable.roleId, roleId));
		return rows.map((row) => row.userId);
	}

	async findIdsByPermission(
		permissionId: string,
		tx?: DbTransaction,
	): Promise<string[]> {
		const database = tx || this.dbInstance;
		const rows = await database
			.selectDistinct({ userId: user_rolesTable.userId })
			.from(user_rolesTable)
			.innerJoin(
				role_permissionsTable,
				eq(role_permissionsTable.roleId, user_rolesTable.roleId),
			)
			.where(eq(role_permissionsTable.permissionId, permissionId));
		return rows.map((row) => row.userId);
	}

	/** Live, active users only; anything else resolves to null and the caller answers 401. */
	async UserInformation(
		id: string,
		tx?: DbTransaction,
	): Promise<UserInformation | null> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(
				eq(usersTable.id, id),
				eq(usersTable.status, "active"),
				isNull(usersTable.deleted_at),
			),
			columns: { id: true, email: true, name: true },
			with: {
				user_roles: {
					columns: {},
					with: {
						role: {
							columns: { name: true },
							with: {
								role_permissions: {
									columns: {},
									with: { permission: { columns: { name: true } } },
								},
							},
						},
					},
				},
			},
		});

		if (!user) return null;

		const permissions = new Set<string>();
		for (const userRole of user.user_roles) {
			for (const rolePermission of userRole.role.role_permissions) {
				permissions.add(rolePermission.permission.name);
			}
		}

		return {
			id: user.id,
			email: user.email,
			name: user.name,
			roles: user.user_roles.map((userRole) => userRole.role.name),
			permissions: [...permissions],
		};
	}
}
