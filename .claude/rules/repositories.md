# Rule: Repositories (`src/libs/database/postgres/repositories/*.repository.ts`)

Repositories are the **only** layer that talks to Drizzle for application data. Services consume them
through constructor injection; route handlers never import `db` (the health probe is the exception).

## Shape — `@injectable()` class

```ts
@injectable()
export class RoleRepository {
	private dbInstance = db;

	async findById(id: string, tx?: DbTransaction): Promise<{ id: string; name: string } | null> {
		const database = tx || this.dbInstance;
		const role = await database.query.roles.findFirst({
			where: eq(rolesTable.id, id),
			columns: { id: true, name: true },
		});
		return role ?? null;
	}
}
```

- Every method takes `tx?: DbTransaction` and starts with `const database = tx || this.dbInstance`.
- Export from `repositories/index.ts`; consumers import from `@database`.

## Reads return `null`, they do not throw

A miss resolves to `null`; the service decides whether that is a 404. A repository never throws
`NotFoundError` or `UnprocessableEntityError`, never checks uniqueness before a write, and never
imports `@i18n` for a business rule. Lookups the services rely on:

| Method | For |
| --- | --- |
| `findById(id)` | existence before update/delete |
| `findByName(name, excludeId?)` | role / permission uniqueness |
| `findLiveByEmail(email, excludeId?)` | user uniqueness among live users |
| `findExistingByNames(names)` | permission batch create |
| `countExisting(ids)` | verifying `roleIds` / `permissionIds` |
| `getDetail(id)` | the detail DTO, `null` when absent |
| `findIdsByRole(roleId)`, `findIdsByPermission(permissionId)` | cache invalidation of holders |

## Soft delete

Every `users` read filters `isNull(usersTable.deleted_at)`; `delete` stamps `deleted_at`.
`UserInformation(id)` additionally requires `status = 'active'` — any other user resolves to `null`.

## Datatable reads

Each list repository declares and **exports** at module scope:

```ts
const roleOrderableColumns = { id: rolesTable.id, name: rolesTable.name, createdAt: rolesTable.created_at, updatedAt: rolesTable.updated_at };
export const roleSortableFields = Object.keys(roleOrderableColumns);
export const roleSearchColumns = ["name"];
export const roleFilterableFields: FilterField[] = ["name", { field: "createdAt", kind: "date" }, { field: "updatedAt", kind: "date" }];
export const roleFilterExample: Record<string, string> = { name: "admin", createdAt: "2024-01-01,2024-12-31", updatedAt: "2024-01-01,2024-12-31" };
```

`findAll` then calls `DatatableToolkit.assertFilter(filter, <entity>FilterableFields)` (unknown key or
out-of-range enum value → 400) and `DatatableToolkit.parseSort(<entity>OrderableColumns, sort)`
(unknown key → 400). The route's query schema is built from the same exports, so docs and enforcement
cannot drift ([validation.md](./validation.md)).

- **Sort keys are camelCase API names** mapped to snake_case columns, in the vocabulary of
  `defaultSort = "createdAt"`.
- **Every filter clause is pushed onto one array and ANDed** — never reassign a single accumulator,
  which keeps only the last filter.
- **Comma semantics per kind:** enum → `inArray` of the split values; `kind: "id"` → `inArray`
  (never `eq`); `kind: "date"` → `DatatableToolkit.filterDateRange(value, key)` giving inclusive
  `gte`/`lte` bounds (a single date = that whole day in `APP_TIMEZONE`, `start,end` = range, anything
  unparseable = 400); plain text → `ilike %value%` with a literal comma.
- **Search** is `ilike %term%` over the exported search columns. An enum column is cast to text
  first (`ilike(sql\`${usersTable.status}::text\`, ...)`) — `ilike` on a Postgres enum is an error.
- **Counts**: `database.$count(table, where)` in `Promise.all` with the page query.
- **Output is camelCase DTOs** from `@types` (`createdAt`, `updatedAt`, `isAssigned`); map from the
  snake_case columns here.

## Don't

- No business rules, existence checks, uniqueness checks, cache, hashing, JWT, mail, or queues.
- Don't open a transaction; accept `tx`.
- Don't select a password hash in a method whose result leaves the service layer.
