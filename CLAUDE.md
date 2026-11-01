# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A clean-architecture REST starter on **Fastify 5** (Zod type provider) with
**Drizzle ORM** on **PostgreSQL**, **Redis** for cache and the rate limiter, **BullMQ** for queued mail,
optional **ClickHouse**, and **tsyringe** for DI, running on **Bun**. Auth is JWT: an access token
(1 day, `JWT_SECRET`) plus a refresh token (7 days, `JWT_REFRESH_SECRET`, rotated by `/auth/refresh`).
The shipped domain is auth (register, verify, login, refresh, forgot/reset password), the caller's
profile, and settings for users, roles and permissions under RBAC.

## Commands

Runtime and package manager are **Bun**; use `bun run` / `bunx`, never npm/pnpm/yarn. The `Makefile`
wraps the scripts and is the entry point.

```bash
# Development
make dev                  # API + worker with hot reload (bun run dev)
make dev-server           # API only
make dev-worker           # BullMQ worker only

# Quality
make lint                 # eslint
make lint-fix
make format               # prettier --write .
bun run format:check
make typecheck            # tsc --noEmit
make build                # typecheck + dist/serve.js + dist/worker.js

# Tests
# No test runner is configured. Do not invent `bun test` commands.

# Database
make db-generate          # drizzle-kit generate (review the SQL before applying)
make db-migrate           # drizzle-kit migrate
make db-seed              # permissions -> roles (+grants) -> users; idempotent, exits 1 on failure
make fresh                # DESTRUCTIVE: drop schema + migrate + seed (refuses NODE_ENV=production)
make reset                # generate + migrate + seed
make db-clickhouse-migrate

# Deployment
make docker-build | docker-up | docker-down | docker-migrate | docker-seed | docker-deploy
```

Seeding creates the 15 `<group> <action>` permissions, the `superuser` and `admin` roles (both granted
the whole catalogue), and `superuser@example.com` / `admin@example.com` with password
`S3crEtP4ssw0rd!`. A second run changes nothing.

The pre-commit hook (`.husky/pre-commit`) runs `bun install`, `format`, `lint:fix`, `i18n:keys`,
`drizzle-kit generate`, `drizzle-kit migrate`, `tsc --noEmit`, `build`. It needs a reachable
`DATABASE_URL`.

## Architecture

| Alias           | Path                | Purpose                                                                                                              |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@config`       | `src/libs/config`   | `env.config.ts` (envalid, the only `process.env` reader) and derived config objects                                  |
| `@database`     | `src/libs/database` | `db`, Drizzle tables, repositories and their allow-lists, `DbTransaction`, `RedisClient`, ClickHouse                 |
| `@fastify-libs` | `src/libs/fastify`  | defaults (`StrongPassword`, `defaultSort`, token lifetimes), error classes, guards, DI re-exports                    |
| `@cache`        | `src/libs/cache`    | `Cache`, cache-key builders                                                                                          |
| `@i18n`         | `src/libs/i18n`     | `t()`, catalogues, generated key union                                                                               |
| `@types`        | `src/libs/types`    | DTOs, `DatatableType`, `FilterField`                                                                                 |
| `@utils`        | `src/libs/utils`    | `ResponseToolkit`, response/query schema builders, `DatatableToolkit`, `Hash`, `StrToolkit`, `DateToolkit`, `logger` |
| `@services`     | `src/services`      | `@injectable()` service classes                                                                                      |
| `@routes`       | `src/routes`        | route modules (registered in `src/app.ts`)                                                                           |
| `@bull`         | `src/bull`          | queues, workers, worker entry                                                                                        |

### Request flow

Route handler (`src/routes/<feature>/index.ts`) -> service (`src/services/`, resolved with
`fastify.di.resolve(...)`) -> repository (`src/libs/database/postgres/repositories/`). Services open
every transaction and pass `tx` down; repositories only accept one.

`src/app.ts` registers everything **explicitly** (no autoload, so the bundled `dist/` runs the same as
source), in order: `@fastify/jwt`, `@fastify/redis`, the Zod compilers, the `externals/` plugins
(helmet, cors, i18n, rate limit, swagger), the `app/` plugins (auth, di, error), then each entry of the
`routes` array with its prefix. A route folder mirrors its URL prefix.

### The non-obvious bits

- **Authorization is per route and default-open.** A protected module adds an `onRequest` hook calling
  `await request.authenticate()`; each route then declares `onRequest: PermissionGuard([...])` or
  `RoleGuard([...])` from `@fastify-libs`. Guards throw, so a refused request never reaches validation
  or the handler. A route with no guard is open to every logged-in user. `superuser` bypasses both.
- **Access vs refresh.** Access tokens carry `type: "access"` and are verified with `JWT_SECRET`;
  refresh tokens carry `type: "refresh"`, are signed with `JWT_REFRESH_SECRET`, and their `jti` is stored
  in Redis per user, so a refresh rotates the pair and a refresh token is never accepted as a bearer.
- **UserInformation is cached** (`user:<id>`, 1 hour) by `SessionService`. Any write that changes a
  user's status, roles, permissions, password or deletion must call `forgetUsers` / `revokeSessions`;
  role and permission edits invalidate every holder.
- **Repositories return `null`; services throw.** Existence is `NotFoundError` (404), uniqueness is
  `UnprocessableEntityError` (422). Datatable inputs (unknown filter key/value, bad date) are
  `BadRequestError` (400) from the repository.
- **Filters are read off the raw URL.** The Zod query schema strips `filter[<key>]`;
  `DatatableToolkit.parseFilter(request)` reads them from `request.url`. Sort and filter allow-lists
  are exported by each repository and reused by the route's query schema.
- **Responses are camelCase** (`createdAt`, `isAssigned`) although columns are snake_case; the
  repository maps them.
- **Env only through `@config`.** `JWT_SECRET` and `JWT_REFRESH_SECRET` are required with no default,
  at least 32 characters, never a known placeholder, and different; startup rejects anything else.
- **Logs go to stdout and `storage/logs/app.log`**; mail logs never carry the recipient address.
- **Request bodies are capped at 100 KB** (`bodyLimit` in `src/app.ts`, 413 above it).
- **Docs are gated** by `ENABLE_API_DOCS` (default `false`): `/docs` and `/docs/openapi.json`.
- **Mail is queued** after the transaction that minted its token commits (`AuthMailService`); the
  worker is a separate process (`src/bull/index.ts`).
- **Soft delete** on `users` (`deleted_at`); every user read filters it. Roles and permissions are hard
  deleted and their join rows cascade.
- **Login is enumeration-safe**: password checked first (against a dummy hash for unknown emails),
  one message for unknown email and wrong password; resend-verification and forgot-password always 200.

## Conventions

- Prettier: tabs, double quotes, semicolons, trailing commas, width 80. `simple-import-sort` owns import
  order. No `any`, no floating promises, no `console.*` outside entry points and scripts.
- Comments only where the why is non-obvious: one block above the block, no line narration.
- Permission strings are space-separated `<group> <action>` (`"user list"`, `"role edit"`); a guard
  string the seeder does not produce fails closed.
- `PATCH`, never `PUT`; collections are plural kebab-case; no global prefix.
- 422 for uniqueness conflicts; 400 for login and token failures and bad datatable input.
- Every user-facing string is an i18n key in both `en.json` and `id.json`; run `bun run i18n:keys`.
- Rate limit: global, 100/min per `request.ip`, never keyed on client headers.
- Always in scope: `.claude/rules/contradiction-halt.md` and `.claude/rules/documentation.md`.

## Adding a new feature module

1. Add the table to `src/libs/database/postgres/schema/` and register it in `schema/index.ts`; run
   `make db-generate` and review the SQL.
2. Add `src/libs/database/postgres/repositories/<entity>.repository.ts` (`@injectable()` class, `tx?`
   on every method, reads return `null`, exported sort/filter allow-lists) and export it from the barrel.
3. Add `src/services/<feature>.service.ts` (`@injectable()`), owning checks and transactions; export it
   from `src/services/index.ts`.
4. Add `src/routes/<feature>/{index.ts,schema.ts}`: authenticate hook, a guard on every route, Zod
   schemas, a `response` map listing every status the route can return. Register the module in the
   `routes` array of `src/app.ts` with its prefix.
5. If it needs new permissions, extend `src/libs/database/seed/permission.seed.ts` in the same change.
6. Add i18n keys to both catalogues, update `.claude/rules/routes.md` and `docs/API_DOCUMENTATION.md`.

## Deeper documentation

- `docs/README.md` - index
- `docs/API_DOCUMENTATION.md` - envelope, auth, route map, list query
- `docs/CONFIGURATION.md` - every env var
- `docs/DEPLOYMENT.md` - Docker images, compose, migrations
- `docs/ERROR_HANDLING.md` - error classes and status mapping
- `docs/SECURITY.md` - auth, RBAC, rate limiting, headers
- `docs/PLUGINS.md` - the Fastify plugin stack

## Skills, rules, and commands

- **Skills**: `.claude/skills` is a symlink to `.agents/skills/` (vendored, indexed in
  `.agents/skills/README.md`; `skills-lock.json` is gitignored). `fastify-best-practices` covers
  Fastify specifics.
- **Rules**: `.claude/rules/` - start at `.claude/rules/README.md`. A rule is more specific than this
  file and wins on conflict.
- **Commands**: `/commit`, `/audit-flow` (read-only sweep writing `docs/audit-findings.md`),
  `/update-todo` (reconcile `TODO.md` with the code).
