# Rule: Validation (`src/routes/<feature>/schema.ts`)

All HTTP input and output is validated by **Zod** through `fastify-type-provider-zod` (the validator
and serializer compilers set in `src/app.ts`). Schemas are declared in the route folder's `schema.ts`
and wired into the route's `schema`; nothing is re-validated in a handler or service.

## Naming

Entity first, action, then `Schema`: `UserCreateSchema`, `UserUpdateSchema`, `UserListSchema`,
`UserDetailSchema`, `UserQuerySchema`, `UserIdParamsSchema`, `UserResetPasswordSchema`. Auth-flow
inputs keep verb names: `LoginBodySchema`, `RegisterBodySchema`, `ResetPasswordBodySchema`.

## Field requirements

- **Every field gets `.describe(...)`** — it becomes the property doc in `/docs`.
- Prefer semantic validators: `z.email()`, `z.uuid()`.
- Length and pattern constraints live in the schema; "email already taken" is service work.
- **Passwords** use `StrongPassword` from `@fastify-libs` with `.min(8)`, never a fresh regex.
- **Enums come from Drizzle**: `z.enum(Object.values(UserStatus) as [string, ...string[]])`. Never
  restate the members.
- **`:id` params** use `z.object({ id: z.uuid() })` — a malformed id is a 422, not a Postgres error.
- Request id arrays are camelCase: `roleIds`, `permissionIds`.
- `.nullable()` means "may be null"; `.optional()` means "may be absent". `remark` is
  `.nullable()` and required as a key.

## List query schemas come from `buildDatatableQueryParamsSchema`

```ts
export const RoleQuerySchema = buildDatatableQueryParamsSchema({
	sortFields: roleSortableFields,
	filterFields: roleFilterableFields,
	filterExample: roleFilterExample,
	searchColumns: roleSearchColumns,
});
```

Pass the **repository's exported** arrays, never a restated list ([repositories.md](./repositories.md)).
The builder gives `page` (int ≥ 1, default 1), `perPage` (int 1-100, default 10), `search`, `sort`
(closed enum of the sortable keys, default `createdAt`), `sortDirection` (`asc` | `desc`, default
`desc`) — any violation is a **422**.

**The `filter` object in the schema is documentation only.** Filters travel as flat
`filter[<key>]=<value>` parameters, which Zod strips from `request.query`.
`DatatableToolkit.parseFilter(request)` reads them off `request.url`, and the repository enforces the
key set and enum ranges with a **400**. Don't "simplify" this by reading `request.query` alone —
that is how filtering silently never worked.

## Response schemas

- Wrap data in the envelope: `createSuccessResponseSchema(DataSchema, status?)`,
  `createSuccessPaginationResponseSchema(ItemSchema)`, or the `Null*ResponseSchema` constants.
- **Response fields are camelCase** (`createdAt`, `updatedAt`, `isAssigned`, `appName`) although the
  columns are snake_case; the repository maps them.
- Dates are `z.date()`; the serializer emits ISO strings.
- The serializer drops undeclared fields, so a field missing from the schema never reaches the
  client — and a hash or token the repository over-selected never does either. Keep request and
  response schemas separate.

## Don't

- Don't validate in the handler or service what the schema can express.
- Don't reuse an input schema as a response schema.
- Don't declare a field the route neither reads nor returns.
