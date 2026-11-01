## What does this change?

<!-- One or two sentences. What is different after this PR that was not true before? -->

## Why?

<!-- The problem being solved. Link the issue if there is one: Closes #123 -->

## Type of change

- [ ] `feat` — new feature, route, or endpoint
- [ ] `fix` — bug fix
- [ ] `refactor` — restructuring, no behaviour change
- [ ] `docs` — documentation only
- [ ] `chore` — config, dependencies, tooling
- [ ] `db` — schema or migration change

## Checklist

<!-- The repo's standards live in .claude/rules/ and CLAUDE.md. Consult the relevant rule before ticking. -->

- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (see `.github/CONTRIBUTING.md`).
- [ ] `bun run lint`, `bun run format:check`, `bun run typecheck`, and `bun run build` pass locally.
- [ ] Layering respected: route `index.ts` (HTTP only) → `@injectable()` service in `src/services/` (logic, transactions, cache, queue dispatch) → repository in `src/libs/database/postgres/repositories/` (SQL only, reads return `null`). Routes never import `db`.
- [ ] Services are resolved with `fastify.di.resolve(Service)`, never `new`-ed.
- [ ] Shared code lives in the right `src/libs/<bucket>/` and is re-exported from that bucket's `index.ts` barrel; no relative imports across route folders.
- [ ] Imports use path aliases (`@config @database @fastify-libs @cache @utils @types @i18n @services @bull`), never `../../libs/...`.
- [ ] No `any` (`no-explicit-any` is an error); explicit return and parameter types; unused params prefixed `_`.
- [ ] Every promise is `await`ed or `void`ed (`no-floating-promises` is an error).
- [ ] No `console.*` in application code — used the structured `logger` from `@utils` (pino).
- [ ] New/changed routes declare `body` / `querystring` / `params` Zod schemas from the route's `schema.ts`, every field has `.describe(...)`, and `:id` params are `z.uuid()`.
- [ ] New/changed routes declare `schema.response` keyed by **every** status code the route can return, plus `tags`, `summary`, and `description`.
- [ ] Successful responses go through `ResponseToolkit.success(reply, data, message, status)`; failures `throw` an error class from `@fastify-libs` — no hand-built envelopes, no `reply.status(4xx).send(...)`.
- [ ] Protected routes authenticate in the module `onRequest` hook and are gated per route with `onRequest: PermissionGuard([...])` or `RoleGuard([...])`, naming a permission the seeder produces.
- [ ] New queue/worker pairs share a queue name and payload type, reuse `RedisClient.getQueueRedisClient()`, and re-throw on failure so BullMQ retries.
- [ ] New user-facing strings added to **both** `src/libs/i18n/locales/en.json` and `id.json`, with `bun run i18n:keys` re-run and the generated keys committed.
- [ ] Any new env var added to `src/libs/config/env.config.ts` (envalid), surfaced through a `@config` object, and added to `.env.example` and `docs/CONFIGURATION.md` — never read `process.env` elsewhere.
- [ ] Docs my change makes wrong are fixed **in this PR** (`README.md`, `CLAUDE.md`, `docs/`, the matching `.claude/rules/` file).

## Database changes

<!-- Delete this section if the PR touches no schema. -->

- [ ] Schema edited in `src/libs/database/postgres/schema/`.
- [ ] Migration generated with `make db-generate` and the files in `src/libs/database/postgres/migrations/` are committed — CI fails if `bun run db:generate` produces a diff.
- [ ] No already-applied migration was hand-edited.
- [ ] Migration reviewed for destructive operations (dropped columns, narrowed types, lost data).
- [ ] Soft-deleted users still filtered — reads include `isNull(usersTable.deleted_at)`.
- [ ] Seed data in `src/libs/database/seed/` updated if the new shape needs it, and still idempotent.

## How was this tested?

<!--
There is no test runner configured in this repo, so say what you actually exercised:
commands run, endpoints hit, request/response bodies observed. "It builds" is not testing.
-->

## Screenshots or output

<!-- Optional: request/response bodies, /docs screenshots, worker logs. -->
