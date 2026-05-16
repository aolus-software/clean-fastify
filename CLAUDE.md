# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime & package manager

This project uses **Bun** (>= 1.0) as both the runtime and package manager. All scripts run via `bun run`, and the dev server uses `bun --hot --watch`. Do not substitute `npm`/`pnpm`/`yarn` commands.

Both build and runtime target Bun (`--target bun`, minified). `bun run build` produces `dist/serve.js` and `dist/worker.js`; `bun run build:binary` / `build:binary:worker` produce standalone `./server` and `./worker` executables via `bun build --compile`.

## Common commands

Both `make <target>` and `bun run <script>` work; the Makefile is a thin wrapper. Use whichever — they invoke the same scripts.

```bash
# Development (runs API + worker concurrently)
bun run dev               # or: make dev
bun run dev:server        # API only
bun run dev:worker        # BullMQ worker only

# Build & production
bun run build             # typecheck + build server + build worker (bun target, minified)
bun run build:server      # → dist/serve.js
bun run build:worker      # → dist/worker.js
bun run build:binary      # standalone executable ./server  (bun --compile)
bun run build:binary:worker # standalone executable ./worker
bun run start             # run dist/serve.js + dist/worker.js with bun (concurrently)

# Quality gates
bun run typecheck         # tsc --noEmit
bun run lint              # eslint . --ext .ts,.js
bun run lint:fix
bun run format            # prettier --write .

# Database (PostgreSQL / Drizzle)
bun run db:generate       # generate migrations from schema
bun run db:migrate        # apply pending migrations
bun run db:push           # push schema directly (dev only)
bun run db:studio
bun run db:seed
make fresh                # db:drop + db:push + db:seed
make reset                # db:generate + db:migrate + db:seed

# ClickHouse migrations
bun run db:clickhouse:migrate
bun run db:clickhouse:status

# Tests
bun test                  # no tests currently exist in the repo
```

The pre-commit hook (`.husky/pre-commit`) runs: `bun install`, `format`, `lint:fix`, `drizzle-kit generate`, `drizzle-kit migrate`, `tsc --noEmit`, then `bun run build`. Expect the hook to touch migration files and require a live DB connection — keep `DATABASE_URL` valid locally or the commit will fail.

## Architecture

Two entry points share the same `src/` tree:

- **API server** — `src/serve.ts` → `createAppInstance()` in `src/app.ts`
- **BullMQ worker** — `src/bull/index.ts` (imports `worker/*.worker.ts` for side effects)

Both must import `reflect-metadata` at the top before any DI use.

### App bootstrap (`src/app.ts`)

`createAppInstance()` wires the Fastify instance in a fixed order — preserve this when adding plugins:

1. `@fastify/jwt` and `@fastify/redis` (infrastructure)
2. Zod validator/serializer compilers (`fastify-type-provider-zod`)
3. `@fastify/autoload` on `libs/fastify/plugins/externals/` — security plugins (helmet, cors, rate-limit, swagger)
4. `@fastify/autoload` on `libs/fastify/plugins/app/` — app plugins (auth, authorization, di, error, superuser)
5. `@fastify/autoload` on `routes/` — every directory under `src/routes/` becomes a route prefix; the file's default-exported function receives the Fastify instance

To add a new route module: create `src/routes/<feature>/index.ts` exporting a default `(fastify) => { ... }` — autoload picks it up. Schemas live alongside in `schema.ts`.

### Dependency injection (tsyringe)

Services and repositories are classes decorated with `@injectable()` and resolved through `fastify.di.resolve(SomeService)` (the DI plugin decorates the Fastify instance with the tsyringe `container`). Constructor params are auto-wired — make sure `emitDecoratorMetadata` and `experimentalDecorators` stay on in `tsconfig.json`, and import `reflect-metadata` once at process start.

When adding a new service: decorate with `@injectable()`, declare dependencies as constructor params, export from `src/services/index.ts` (or the relevant barrel), and resolve via `fastify.di.resolve(...)` inside route handlers — never `new` it directly.

### Path aliases

`tsconfig.json` defines aliases that match the `libs/` layout — use them instead of relative paths:

| Alias                             | Resolves to                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@config`                         | `src/libs/config`                                                                                 |
| `@database`                       | `src/libs/database` (re-exports drizzle `db`, repositories, schema tables, RedisClient)           |
| `@fastify-libs`                   | `src/libs/fastify` (re-exports DI decorators, error classes, plugin barrel)                       |
| `@cache`                          | `src/libs/cache`                                                                                  |
| `@utils`                          | `src/libs/utils` (flat export — date, number, string, hash, encrypt, response, logger, datatable) |
| `@types`                          | `src/libs/types`                                                                                  |
| `@routes` / `@services` / `@bull` | route handlers, services, queue definitions                                                       |

### Request lifecycle for protected routes

1. Route opts in by calling `request.authenticate(reply)` from the `auth-plugin` — this calls `jwtVerify()`, then hydrates `request.userInformation` from Redis (cache key `UserInformationCacheKey(userId)`, 24h TTL) or PostgreSQL via `UserRepository.UserInformation()`.
2. RBAC checks use `request.requireRoles([...], reply)` or `request.requirePermissions([...], reply)` from `authorization-plugin`. Users with the `superuser` role bypass all role/permission checks.
3. Errors flow through `error-plugin` (`src/libs/fastify/plugins/app/error.plugin.ts`) which handles `HttpError` subclasses (`UnprocessableEntityError`, `NotFoundError`, etc. in `libs/fastify/error/`) and all Fastify built-in error codes. Always throw the typed `HttpError` subclasses rather than calling `reply.send` directly — the handler converts them into the standard response envelope via `ResponseToolkit`.

### Responses & validation

- Always wrap successful responses with `ResponseToolkit.success(reply, data, message, status)` — keeps the `{ status, success, message, data }` envelope consistent.
- Route schemas use **Zod** through `fastify-type-provider-zod`. Define request/response schemas in the module's `schema.ts` and reference shared error-response shapes (`ValidationErrorResponseSchema`, `UnauthorizedResponseSchema`, `ServerErrorResponseSchema`, `SuccessResponseSchema`).

### Queues (BullMQ)

Producers live in `src/bull/queue/*.queue.ts` (a `Queue` instance using the shared Redis client from `RedisClient.getQueueRedisClient()`). Consumers live in `src/bull/worker/*.worker.ts` and are imported for side effects by `src/bull/index.ts` — to register a new worker, add the import there. Services call `someQueue.add("job-name", payload)` to enqueue.

### Databases

- **PostgreSQL via Drizzle** — schema in `src/libs/database/postgres/schema/`, migrations auto-generated to `src/libs/database/postgres/migrations/`. `drizzle.config.ts` reads `DATABASE_URL` from `.env`. The `db` export is a Drizzle instance with `db.query.*` and `db.transaction(...)` support; repositories accept an optional `tx?: DbTransaction` parameter so they can participate in outer transactions.
- **Redis** — accessed two ways: `fastify.redis` (decorated via `@fastify/redis`, for request-time use) and `RedisClient.getRedisClient()` / `getQueueRedisClient()` (for services and BullMQ).
- **ClickHouse** — optional analytics DB; migrations under `src/libs/database/clickhouse/migrations/` driven by `scripts/migrate.ts`.

## API docs

When the server runs (`http://localhost:8001` by default):

- Swagger UI — `/documentation`
- Scalar reference — `/reference`

## Conventions enforced by tooling

- **TypeScript strict mode** — `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `strictNullChecks` all on. Prefix intentionally-unused vars/args with `_`.
- **ESLint** — `@typescript-eslint/no-explicit-any` and `no-floating-promises` are errors; `no-console` is a warning (existing entry points disable it with line comments where needed). `simple-import-sort` enforces import ordering — let `lint:fix` resolve.
- **Prettier** — tabs for indentation, double quotes, semicolons required.
- `.agents/` and `.claude/` are excluded from ESLint and Prettier.

## Skills

Reusable agent skills live under `.agents/skills/` and are exposed to Claude Code via the `.claude/skills` symlink (→ `../.agents/skills`). Notable skill: `fastify-best-practices` — load it when working on Fastify-specific patterns (plugins, hooks, schemas, serialization).

## Outstanding work

`TODO.md` tracks improvements vs the sibling `clean-hono` project — service interfaces, performance-monitoring middleware, OpenAPI schema descriptions, test infrastructure. Consult before adding overlapping changes.
