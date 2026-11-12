# Contributing

Thanks for considering a contribution. This repository is a **starter template**, so changes are
judged by whether most projects built on it would benefit — not by whether they are useful in one
specific application.

## Before you start

Read these first; they are the source of truth for how code is written here:

- **`CLAUDE.md`** — the `app.ts` bootstrap order, layering, the plugin buckets, and the non-obvious
  behaviours worth knowing (per-route guards, access vs refresh tokens, cache invalidation).
- **`.claude/rules/`** — area-scoped standards, indexed in `.claude/rules/README.md`. Read the matching
  one before you touch that area.
- **`docs/`** — `CONFIGURATION.md` (env vars), `PLUGINS.md`, `ERROR_HANDLING.md`, `SECURITY.md`,
  `API_DOCUMENTATION.md`, `DEPLOYMENT.md`.
- `.github/copilot-instructions.md` has extended code examples that mirror the rules above.

For anything larger than a bug fix, open an issue first so the design can be agreed before you spend
time on it.

## Local setup

The runtime is **Bun**, not Node. Always use `bun run` / `bunx` — never `npm`, `pnpm`, or `yarn`.

```bash
git clone https://github.com/aolus-software/clean-fastify.git
cd clean-fastify
bun install
cp .env.example .env                  # then set JWT_SECRET and JWT_REFRESH_SECRET
docker compose up -d postgres redis   # add clickhouse if you need it
make db-migrate                       # apply migrations
make db-seed                          # superuser@example.com / S3crEtP4ssw0rd!
make dev                              # API + worker
```

The API listens on `APP_PORT` (default 3000). The Scalar API reference is at `/docs` (spec at
`/docs/openapi.json`) only when `ENABLE_API_DOCS=true`, which `.env.example` sets for local work.

Useful commands — every `make` target wraps the matching `bun run` script:

```bash
make help             # every available target
make dev              # API + worker with hot reload
make dev-server       # API only
make dev-worker       # worker only
bun run lint          # eslint . --ext .ts,.js
bun run lint:fix
bun run format        # prettier --write .
bun run format:check  # prettier --check . (what CI runs)
bun run typecheck     # tsc --noEmit
bun run build         # typecheck + dist/serve.js + dist/worker.js
make db-generate      # drizzle-kit generate
make db-migrate       # drizzle-kit migrate
make db-push          # drizzle-kit push (dev only)
make db-studio        # drizzle-kit studio
make db-seed          # idempotent
make fresh            # drop schema + migrate + seed (dev only, destroys data)
make reset            # db-generate + db-migrate + db-seed
```

Tests run on Bun's built-in runner. Unit tests need nothing; integration tests need a PostgreSQL
database whose name ends in `_test` and a Redis:

```bash
docker compose up -d postgres redis
docker compose exec postgres createdb -U postgres clean_fastify_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clean_fastify_test make test
make test-coverage    # what CI runs; fails below the total line-coverage gate
bun test tests/integration/auth.test.ts   # one file
```

A change to a route or service adds or updates its tests in `tests/integration/`. Debug the API with
`bun --inspect src/serve.ts`; `LOG_LEVEL=debug DB_LOG_QUERIES=true` logs every SQL statement.

### Running the whole stack in Docker

```bash
make docker-up        # docker compose up -d --build (postgres, redis, clickhouse, app, worker)
make docker-migrate   # build the migrator target and run migrations on the compose network
make docker-seed
make docker-logs      # tail app and worker logs
make docker-ps
make docker-down
make docker-deploy    # git pull + build + up + migrate (server deploy)
```

`docker-migrate` derives the network name from the directory name (`<dir>_app_network`); if you
renamed the directory, pass `DOCKER_NETWORK=...`. Keep `.env` values **unquoted** —
`docker run --env-file` passes quotes literally. Inside compose, use service hostnames (`postgres`,
`redis`, `clickhouse`), not `localhost`.

## Coding standards

The full set is in `.claude/rules/`. The parts that come up most:

- **Style** — tabs, double quotes, semicolons, trailing commas (Prettier). Imports are sorted by
  `eslint-plugin-simple-import-sort`; let `bun run lint:fix` order them.
- **Types** — TypeScript `strict`, plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`.
  `no-explicit-any` is an **error**. Prefix intentionally-unused parameters with `_`.
- **Promises** — `no-floating-promises` is an error. Always `await` or `void`.
- **Logging** — no `console.*` in application code; use the structured `logger` (pino) from `@utils`.
  Entry points and standalone scripts carry `eslint-disable-next-line no-console` where they print.
- **Path aliases** — `@config`, `@database`, `@fastify-libs`, `@cache`, `@i18n`, `@types`, `@utils`,
  `@services`, `@routes`, `@bull`. Import from the bucket root, never with a relative path that
  climbs out of a route folder.
- **Layering** — a route `index.ts` handles HTTP only and resolves one service with
  `fastify.di.resolve(...)`; `@injectable()` services in `src/services/` own business logic,
  existence/uniqueness checks, transactions, cache invalidation and queue dispatch; repositories own
  SQL, return `null` on a miss, and never open a transaction the caller did not supply.
- **Responses** — `ResponseToolkit.success(reply, data, message, status)` for successes; throw error
  classes from `@fastify-libs` for failures. Never `reply.status(4xx).send(...)`.
- **Authorization** — protected route files add an `onRequest` hook that calls
  `await request.authenticate()`, and each route declares `onRequest: PermissionGuard([...])` or
  `RoleGuard([...])`. Permission strings match the seeded `<group> <action>` catalogue.
- **OpenAPI** — every route declares its Zod schemas plus `tags`, `summary`, `description`, and a
  `response` map listing every status code it can really return.
- **Env** — never read `process.env` outside `src/libs/config/`. Add the variable to
  `src/libs/config/env.config.ts`, expose it through a `@config` object, and document it in
  `.env.example` and `docs/CONFIGURATION.md`.
- **i18n** — no hardcoded user-facing strings. Add the key to **both**
  `src/libs/i18n/locales/en.json` and `id.json`, run `bun run i18n:keys`, and commit the result.

## Adding a feature module

1. Add the table to `src/libs/database/postgres/schema/`, register it in `schema/index.ts`, and run
   `make db-generate`.
2. Add `src/libs/database/postgres/repositories/<entity>.repository.ts` (`@injectable()` class,
   `tx?` on every method, reads return `null`, exported sort/filter allow-lists) and export it from
   the repositories barrel.
3. Add `src/services/<feature>.service.ts` (`@injectable()`) and export it from
   `src/services/index.ts`.
4. Add `src/routes/<feature>/index.ts` and `schema.ts`, and register the module in the `routes`
   array of `src/app.ts` with its URL prefix (the folder mirrors it).
5. Add the routes to `.claude/rules/routes.md` and `docs/API_DOCUMENTATION.md`, and any new
   permission to `src/libs/database/seed/permission.seed.ts`.

## Database changes

Edit the schema in `src/libs/database/postgres/schema/`, then:

```bash
make db-generate   # writes a new migration into src/libs/database/postgres/migrations/
make db-migrate    # applies it
# or: make reset   # generate + migrate + seed
```

Commit the generated migration files. CI runs `bun run db:generate` and **fails if it produces a
diff** in `src/libs/database/postgres/migrations/`, then runs `db:migrate`, `drizzle-kit check`, and
`drizzle-kit introspect` against a real Postgres service.

Never hand-edit a migration that has already been applied. Review every generated migration for
destructive operations before committing. Users are soft-deleted — new read paths on `users` must
filter `isNull(usersTable.deleted_at)`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), lowercase after the colon, imperative
mood, under 72 characters, no trailing period:

```
feat(users): add bulk status update endpoint
fix(auth): reject a refresh token presented as a bearer token
docs: document the docker deploy targets
chore: bump fastify to 5.8.5
```

Types used here: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `db`.

> **Warning — the pre-commit hook touches your database.** The Husky `pre-commit` hook runs, in
> order:
>
> ```sh
> bun install
> bun run format
> bun run lint:fix
> bun run i18n:keys
> bunx drizzle-kit generate
> bunx drizzle-kit migrate
> bun run tsc --noEmit
> bun run build
> ```
>
> `drizzle-kit generate` and `drizzle-kit migrate` **write migration files and apply them against the
> `DATABASE_URL` in your `.env`**. Know what that URL points at before you commit; never let it point
> at a shared or production database.
>
> If you have already run format, lint, typecheck, and build yourself and your change touches no
> schema, `git commit --no-verify` is reasonable.

## Pull requests

1. Branch off `main`.
2. Keep the PR focused — one concern per PR.
3. Fill in the pull request template, including the checklist.
4. Make sure `bun run lint`, `bun run format:check`, `bun run typecheck`, and `bun run build` pass.
   CI (`.github/workflows/ci.yml`) runs lint, the prettier check, typecheck, the Drizzle migration
   checks against a real Postgres service, and the build.
5. Update the docs your change affects **in the same PR** — `README.md`, `CLAUDE.md`, the matching
   `.claude/rules/` file, `docs/`, and the i18n catalogues for new strings.

## Reporting bugs and requesting features

Use the issue templates. Usage questions belong in
[Discussions](https://github.com/aolus-software/clean-fastify/discussions), not issues. Security
vulnerabilities go through [SECURITY.md](SECURITY.md) — never a public issue.

## License

By contributing, you agree that your contributions are licensed under the MIT License that covers
this repository.
