# Rule: Drizzle schema (`src/libs/database/postgres/schema/`)

The schema is the source of truth. `drizzle.config.ts` points `schema` at
`./src/libs/database/postgres/schema` and writes migrations to
`./src/libs/database/postgres/migrations`.

## Files and naming

- One file per aggregate: `user.ts`, `email_verification.ts`, `password_reset_token.ts`, and `rbac.ts`
  (`roles`, `permissions`, `role_permissions`, `user_roles` with their relations).
- Table exports carry the `Table` suffix: `usersTable`, `rolesTable`, `permissionsTable`,
  `role_permissionsTable`, `user_rolesTable`, `email_verificationsTable`, `password_reset_tokensTable`.
  Relations use `<table>Relations`. Keep this repo's existing spelling — don't rename to the base's
  suffix-less style as a drive-by.
- Physical table names are snake_case plural; column names are snake_case (`created_at`,
  `email_verified_at`, `deleted_at`, `user_id`). The two join tables use camelCase **TypeScript**
  keys (`userId`, `roleId`, `permissionId`) over snake_case columns.

## Enums — three exports, one source

```ts
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended", "blocked"]);
export const UserStatus = { ACTIVE: "active", INACTIVE: "inactive", SUSPENDED: "suspended", BLOCKED: "blocked" } as const;
export type UserStatusEnum = (typeof UserStatus)[keyof typeof UserStatus];
```

`userStatusEnum` is the column type; `UserStatus` feeds Zod (`z.enum(Object.values(UserStatus))`)
and the filter allow-list; `UserStatusEnum` types services and repositories. Adding a value edits all
three and needs a migration.

## Standard columns

- PK `uuid().primaryKey().defaultRandom()`.
- `created_at` `timestamp().defaultNow().notNull()`; `updated_at` adds `.$onUpdate(() => new Date())`.
- `users.status` is `NOT NULL DEFAULT 'active'`.
- Soft delete: `users.deleted_at` (nullable). Roles and permissions are hard-deleted.

## Indexes and uniqueness

- `users_email_deleted_at_status_index` on `(email, deleted_at, status)`.
- `users_email_unique_live` — a **partial unique index** on `email WHERE deleted_at IS NULL`. Live
  emails are unique at the database level, a soft-deleted user's email is reusable, and the service's
  `findLiveByEmail` check still runs first so the caller gets a 422 rather than a constraint error.
- `roles_name_unique`, `permissions_name_unique`.
- `users_created_at_live_index` — partial index on `created_at WHERE deleted_at IS NULL`, the default
  user list order (`defaultSort = "createdAt"`).
- `user_roles_role_id_index` and `role_permissions_permission_id_index` — the composite primary keys
  lead with `user_id` / `role_id`, so lookups by the second column (`findIdsByRole`,
  `findIdsByPermission`, and the `ON DELETE CASCADE` from `roles` / `permissions`) need their own.

## Foreign keys

Every FK states its delete behaviour. Join tables and both token tables reference their parents
`ON DELETE CASCADE`. Users are soft-deleted, so the cascade from `users` only fires on a manual purge.

## Token tables need expiry and single use

`email_verifications` and `password_reset_tokens` both carry `user_id`, `token`, `expired_at`
(NOT NULL), `used_at`, a **unique** index on `token` (`*_token_unique`) and an index on
`(user_id, used_at)`.

- Expiry is set from `verificationTokenLifetime()` / `resetPasswordLifetime()` — **functions** called
  at issue time, never module-scope constants.
- **Single use is a stamp, not a delete.** Consumption sets `used_at` on every unused token of that
  user in the same transaction as the write it authorises; issuing a new token stamps the old ones
  first. The consuming service rejects a row that is missing, expired, or has `used_at` set.

## Registration

`schema/index.ts` must (1) add the table and its relations to the `schema` object and (2) export the
table. `db` is typed from that object; a table missing from it is invisible to `db.query.*`.

## Migrations

- `make db-generate` (`drizzle-kit generate`), review the SQL, then `make db-migrate`.
- Never edit a migration that has been applied. A not-yet-applied generated migration may be
  prefixed with data fixes it needs — `0001_tricky_sebastian_shaw.sql` deletes pre-existing reset
  tokens (they had no expiry) and backfills `users.status/created_at/updated_at` before the
  `NOT NULL` changes. It fails if two live users already share an email; resolve those first.
- `make reset` = generate + migrate + seed. `make fresh` = `db:drop` (a script that drops the `public`
  and `drizzle` schemas and refuses `NODE_ENV=production`) + migrate + seed. `drizzle-kit drop` is not
  used: it deletes migration files, not tables.
- `db:push` is development-only.

## Seeds (`src/libs/database/seed/`)

Order: `permission.seed.ts` (15 `<group> <action>` permissions) → `role.seed.ts` (`superuser`, `admin`,
each granted the seeded catalogue, read scoped to catalogue names) → `user.seed.ts`
(`superuser@example.com`, `admin@example.com`, password `S3crEtP4ssw0rd!`, pre-verified, holding the
role of the same name). Every insert is `onConflictDoNothing` or guarded by a live lookup, so a re-run
is a no-op; `index.ts` exits 1 on failure. Guard strings must match the catalogue ([rbac.md](./rbac.md)).

## Don't

- Don't put queries in schema files, or add a table without registering it.
- Don't add a token table without `expired_at`, `used_at`, a unique `token` and the `(user_id, used_at)` index.
- Don't enforce single use by deleting the row, or read a token without checking `used_at`.
