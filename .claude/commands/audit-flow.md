---
name: audit-flow
description: "Read-only whole-codebase audit of this Fastify backend for auth/token flow contradictions, RBAC gaps, soft-delete correctness, secrets at rest, i18n parity, dead code/validation, shared-code placement, response-contract drift, and doc drift. Writes explained findings (what it is · why · what it costs · what to do) to docs/audit-findings.md. Never modifies application code."
risk: safe
source: local
---

# Audit Flow

Run a structured, **read-only** audit of this backend and record the results in
`docs/audit-findings.md`. This command **never changes application code, schemas, migrations, seeds,
or config** — its only output is the findings document.

`$ARGUMENTS` (optional) narrows scope to specific categories or paths (e.g. `audit-flow auth rbac`,
`audit-flow src/routes/settings`). **With no arguments, sweep the entire codebase** as defined under
"What a full sweep covers" — not a sample, not the modules that changed recently.

## How to run it

1. **Read the ground truth first**: `CLAUDE.md`, every `.claude/rules/*.md`, and
   `.claude/rules/audit-findings.md` in particular — that is the writing contract, and it is read
   before a single finding is written. These define the intended behaviour that findings are measured
   against: a finding is always "code vs stated intent", never "code vs the auditor's taste". Where
   no rule states an intent, say so in the finding rather than inventing one.
2. **Build the inventory before dispatching anything.** Enumerate what exists so coverage is a fact
   rather than a hope: every folder under `src/routes/`, every service in `src/services/`, every bucket under
   `src/libs/`, every table in `src/libs/database/postgres/schema/`, every migration in
   `src/libs/database/postgres/migrations/`, and every queue/worker pair in `src/bull/`. Keep this
   list — it is what the report's Coverage section is written from.
3. **Dispatch parallel read-only `Explore` subagents** — one per category below, each given its slice
   of the inventory so every file has an owner. Do not read serially in the main thread. If a
   category is too large for one agent, split it by module and say so in Coverage.
4. **Each subagent returns evidence, not prose**: `file:line` for every claim, the intended behaviour
   per the rules, what the code actually does, the gap, and whether it traced the path end to end
   (**CONFIRMED**) or is guessing (**SUSPECT**, plus what would settle it).
5. **Write the findings up yourself, in the main thread.** A subagent's terse notes are raw material.
   Every finding gets the five blocks required by `.claude/rules/audit-findings.md`:

   > **Where** (`file:line`) · **What this is** · **Why this can happen** · **What it costs** ·
   > **What we should do**

   written so someone who has never opened that file understands the problem without reading code.
   Tag each 🔴 bug · 🟠 inconsistency · 🟡 hygiene · 📄 doc, by consequence, never by effort.
6. **Write the Coverage section** — what was reached, and what was deliberately not. A category with
   no findings says so and names what was checked.
7. **Write "Top priorities" last**, ordered security → data integrity → correctness → hygiene/doc, in
   the plainest language in the document.
8. **Report a short summary to the user. Do not fix anything** — fixes are a separate, explicitly
   requested step.

## What a full sweep covers

Everything below is in scope for an unscoped run.

| Area | Includes |
|---|---|
| `src/serve.ts`, `src/app.ts` | boot order, JWT and Redis registration, Zod compilers, explicit plugin and `routes` registration, `listen` host/port |
| `src/libs/fastify/plugins/externals/**` | helmet, cors, i18n, rate limit (key, store, 429 body), swagger (the `ENABLE_API_DOCS` gate) |
| `src/libs/fastify/plugins/app/**` | `authenticate` (token type, cache-aside via `SessionService`), di, error and not-found handlers |
| `src/libs/fastify/guards/**`, `src/libs/fastify/error/**`, `src/libs/fastify/default/**` | `PermissionGuard`, `RoleGuard`, the error classes, token-lifetime functions, `StrongPassword` |
| `src/routes/**` | every route file and schema: module `authenticate` hook, per-route `onRequest` guard, response maps |
| `src/services/**` | auth (login, register, verify, forgot/reset, refresh), auth-mail, session, profile, settings services |
| `src/libs/database/postgres/**` | `schema/`, `migrations/`, `repositories/` (allow-lists, soft-delete filters, `tx`), `scripts/drop.ts` |
| `src/libs/database/seed/**` | permission catalogue, role grants, users, idempotency, exit code |
| `src/libs/database/redis/**`, `src/libs/cache/**` | cache keys, TTLs, invalidation on write |
| `src/libs/database/clickhouse/**` | optional analytics client and migration runner |
| `src/libs/config/**` | `env.config.ts` validation and derived config objects |
| `src/libs/i18n/**` | `en.json` / `id.json` parity, `keys.generated.ts`, validation message mapping |
| `src/libs/mail/**`, `src/bull/**` | templates and locale variants, `send-email` queue/worker retry and logging |
| `src/libs/utils/**`, `src/libs/types/**` | `ResponseToolkit`, response/query schema builders, `DatatableToolkit`, `Hash`, `StrToolkit`, DTOs |
| repo root | `Makefile`, `.env.example`, `Dockerfile`, `docker-compose.yml`, `package.json` scripts, `.husky/`, `.github/workflows/ci.yml` |

**Deliberately out of scope** (state this in Coverage): `node_modules/`, `dist/`, `storage/`,
lockfiles, and `.agents/skills/` (vendored; `.claude/skills` is a symlink to it).

Coverage is not optional. If a partial sweep is forced, **say which areas were not reached**.

## Categories to cover

1. **Auth & token flows** — register → verify-email → login and forgot-password → reset-password:
   expiry, `used_at` single use, revoke-on-issue, mail queued after commit; access vs refresh token
   separation (different secrets, `type` claim checked on both sides, `jti` rotation in Redis);
   lifetimes from functions or `JwtConfig`, not inline numbers.
2. **Access control** — every route against its guard: a route in a file with the `authenticate`
   hook but no `onRequest: PermissionGuard/RoleGuard`; a guard string the seed does not produce; a
   guard that does not stop the handler; privilege-granting routes not gated on `superuser`.
3. **Ownership & self-service** — `src/routes/profile/**` and any `:id` route that can act on another
   user. A privilege-escalation path is 🔴 and sorts first.
4. **Soft delete & data integrity** — `isNull(usersTable.deleted_at)` on every user read, no hard
   delete of users, declared unique constraints (`users_email_unique_live`, role/permission names),
   cascades, transactions opened by services only.
5. **Secrets & sensitive data** — hashes, JWT secrets, tokens and `APP_KEY` absent from logs,
   responses, response schemas, OpenAPI examples and repository column selections; env read only
   through `@config`.
6. **i18n parity** — same keys and placeholders in `en.json` and `id.json`; user-facing literals that
   bypass `t()`.
7. **Response-contract completeness** — a `response` map missing a status the route can return (or
   listing one it cannot); missing `tags`/`summary`/`description`/`security`; hand-built envelopes;
   snake_case fields in a response.
8. **Validation & dead code** — Zod fields never read, missing `.describe()`, restated enums, query
   schemas not built from the repository's exported allow-lists, unused exports.
9. **Shared-code placement** — cross-route relative imports, helpers duplicated across routes, a
   bucket export missing from its barrel.
10. **Caching & queues** — cache keys that can collide; a write that changes roles, permissions,
    status or deletion without `SessionService` invalidation (a security finding); TTL units; jobs
    enqueued inside a transaction; a worker that swallows errors.
11. **Data model & migrations** — schema vs migrations, a schema change with no migration, an edited
    applied migration, indexes missing on filtered or sorted columns.
12. **Rate limiting & headers** — limiter key, store, credential endpoints, CORS origin handling,
    helmet, the docs gate.
13. **Documentation drift** — `CLAUDE.md`, `README.md`, `docs/*`, `.claude/rules/*` (especially the
    route map in `routes.md`) versus the code: env names, routes, permission strings, aliases,
    `Makefile` targets.

## Rules for this command

- **Read-only.** If the audit surfaces a bug or rule contradiction, **report it — do not act on it**
  (`.claude/rules/contradiction-halt.md`). The findings document is the one file this command writes.
- **Writing format is governed by `.claude/rules/audit-findings.md`** — the five blocks, plain
  language, severity by consequence, CONFIRMED-vs-SUSPECT honesty, document layout, permanent finding
  numbers, and how a resolved finding is marked. Read it before writing the report.
- **Prefer updating the existing `docs/audit-findings.md`** over creating a new file — one living
  record. Never renumber an existing finding; append new ones.
- **Cite `file:line` for every finding.** No finding without a location.
- **Explain, don't just point.** A finding a reader must open the code to understand has not been
  written yet.
- **There is no test runner configured.** Do not report test results, and treat an unguarded
  invariant with no test as a finding in its own right rather than something you can verify by running.
