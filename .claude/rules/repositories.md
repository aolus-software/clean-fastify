# Rule: Repositories (`src/libs/database/postgres/repositories/*.repository.ts`)

Repositories are the **only** layer that talks to Drizzle directly. Services consume them via constructor injection; route handlers never `import { db }` for queries.

## Shape — injectable class

A repository is an `@injectable()` class so tsyringe can construct it via DI:

```ts
import { db, usersTable } from "@database";
import { injectable } from "@fastify-libs";

@injectable()
export class UserRepository {
	private dbInstance = db;

	get db() {
		return this.dbInstance;
	}

	getDb(tx?: DbTransaction) {
		return tx || this.dbInstance;
	}

	async findByEmail(email: string, tx?: DbTransaction): Promise<UserForAuth> {
		const database = tx || this.dbInstance;
		const user = await database.query.users.findFirst({
			where: and(eq(usersTable.email, email), isNull(usersTable.deleted_at)),
			columns: {
				/* ... */
			},
		});
		if (!user) throw new UnprocessableEntityError("...", [...]);
		return user;
	}
}
```

Services inject the repository in their constructor and reuse the same instance:

```ts
@injectable()
export class AuthService {
	constructor(private _userRepository: UserRepository) {}
	// this._userRepository.findByEmail(...)
}
```

Callers **must not** `new UserRepository()` from a route handler or service body — that bypasses DI and means future swaps (test fakes, scoped lifetimes) can't reach this call site. The one current exception is the `auth.plugin.ts` user-information hydration, which constructs the repo directly because it runs before DI resolution can happen at request time — don't replicate that pattern elsewhere.

## Transaction support

Every mutating method (and read methods that participate in a transaction) accepts an optional `tx?: DbTransaction` and resolves the active connection at the top of the method body:

```ts
async update(
  userId: string,
  data: UserUpdate,
  tx?: DbTransaction,
): Promise<void> {
  const database = tx || this.dbInstance;
  await database.update(usersTable).set(data).where(eq(usersTable.id, userId));
}
```

`DbTransaction` is exported from the postgres barrel (`src/libs/database/postgres/index.ts`). The convention is `const database = tx || this.dbInstance` at the top of the method, then use `database` throughout.

## Queries

- Use Drizzle's typed query builder. Prefer `db.query.<table>.findMany({ where, with, columns })` for relational reads; fall back to `select().from(...)` for joins/aggregates the relational API can't express.
- Compose `WHERE` clauses incrementally with `and(...)`, `or(...)`, `eq`, `ilike`, `isNull`, `exists` — keep a single `SQL | undefined` accumulator. `UserRepository.findAll` is the reference pattern.
- **Soft delete**: most tables use `deleted_at` — every read starts with `let whereCondition: SQL | undefined = isNull(<table>.deleted_at);`. Don't forget this.
- **Datatable reads**: read pagination/search/sort from `DatatableType` (`@types`). Default to `defaultSort` (`@fastify-libs`) and `desc`. Whitelist sortable columns via a `validateOrderBy` map keyed by column name — never trust `queryParam.sort` directly (otherwise users can sort by arbitrary columns).
- **Counts**: use `database.$count(table, whereCondition)` alongside the paged `findMany` — run both inside `Promise.all([...])` so the round-trip is one server hop.
- **Returning shapes**: paginated reads return `PaginationResponse<T>` from `@types`. Per-record DTOs (`UserList`, `UserDetail`, `UserInformation`) are also in `@types` — define a new one there if a new shape is needed.

## What repositories should NOT do

- No business-rule branching that throws `BadRequestError`. Throw `NotFoundError` from `@fastify-libs` when a row is genuinely missing; everything else (duplicate email, weak password, status conflicts) belongs in the service.
- No cache reads/writes. Caching is the service's job (or the `auth.plugin.ts` user-information cache).
- No password hashing / JWT signing / mail sending. Repositories only own SQL.
- No cross-table orchestration that requires a transaction the caller didn't supply — if you need a transaction, accept `tx` and let the caller open it.
- No interaction with BullMQ queues, Redis, or external HTTP. Those belong in services.

## File layout

- One repository per file: `<entity>.repository.ts` under `src/libs/database/postgres/repositories/`.
- Re-export from `src/libs/database/postgres/repositories/index.ts`; that barrel is re-exported by `@database`. Consumers import via `import { UserRepository } from "@database"`. Never import via relative path from outside `libs/database/`.
- One repository per **aggregate**, not per query. New filters/joins extend an existing repo; you don't add a `user-active-subscriptions.repository.ts` next to `user.repository.ts`.
