# Project Rules

Coding rules for the `clean-fastify` codebase (Bun + Fastify 5 + Zod + Drizzle + PostgreSQL). Each
file is a focused, enforceable contract — read the relevant one before writing code in that area.

Rules here carry **no** frontmatter; the scope is stated in the table below and in each file's
opening line.

## Always in scope

These apply to **every** change, regardless of which files it touches. Read them first.

| Rule | Scope |
| ---- | ----- |
| [contradiction-halt.md](./contradiction-halt.md) | A request that contradicts a rule, the architecture, or a security invariant is reported and halted — never silently implemented. Lists the invariants |
| [documentation.md](./documentation.md) | A doc your change makes wrong is fixed in the **same** change; lists every doc that must stay in sync |
| [audit-findings.md](./audit-findings.md) | How an audit finding is written — the writing contract for [`/audit-flow`](../commands/audit-flow.md) |
| [clean-code.md](./clean-code.md) | Formatting, explicit types, no `any`, no `console.*`, comment density |
| [fastify.md](./fastify.md) | Layering (`handler → service → repository`), the explicit `app.ts` registration order, plugin buckets, config, reuse-before-you-build |

## Layer rules

Ordered outside-in, the way a request travels.

| Rule | Applies to |
| ---- | ---------- |
| [middleware.md](./middleware.md) | `src/libs/fastify/plugins/{externals,app}/` — plugin buckets, `fastify-plugin` names, hooks, the throwing `authenticate` |
| [handlers.md](./handlers.md) | `src/routes/<feature>/index.ts` — what a route handler may do and the four things every route declares |
| [handlers-crud.md](./handlers-crud.md) | The canonical five-route CRUD route file and its status codes |
| [validation.md](./validation.md) | `src/routes/<feature>/schema.ts` — Zod request/response schemas, the list-query builder, camelCase responses |
| [services.md](./services.md) | `src/services/` — `@injectable()` service classes, transactions, cache invalidation, error vocabulary |
| [services-crud.md](./services-crud.md) | The canonical CRUD service, which **owns the existence and uniqueness checks** |
| [repositories.md](./repositories.md) | `src/libs/database/postgres/repositories/` — `@injectable()` classes, `tx?`, `null` on a miss, allow-lists, filters |
| [schema.md](./schema.md) | `src/libs/database/postgres/schema/` — Drizzle tables, the three-export enum, token tables, migrations, seeds |
| [shared-code.md](./shared-code.md) | `src/libs/<bucket>/` — which bucket a thing belongs in, aliases, barrels |
| [di.md](./di.md) | tsyringe — `@injectable()`, `fastify.di.resolve(...)`, `container.resolve(...)` |

## Cross-cutting concerns

| Rule | Applies to |
| ---- | ---------- |
| [rbac.md](./rbac.md) | `PermissionGuard` / `RoleGuard` as route-level `onRequest` hooks, the seeded vocabulary |
| [routes.md](./routes.md) | Route registration and prefixes, verb conventions, and the **live route map** with every guard |
| [errors-and-responses.md](./errors-and-responses.md) | The envelope, the error classes, the error plugin's status mapping |
| [openapi.md](./openapi.md) | Route `schema` metadata, tags, `security`, the `ENABLE_API_DOCS` gate |
| [i18n.md](./i18n.md) | `t()` from `@i18n`, the flat `en`/`id` catalogues, the generated key type |
| [mail.md](./mail.md) | `AuthMailService`: tokens minted inside the transaction, mail queued after commit |
| [rate-limiting.md](./rate-limiting.md) | The global `@fastify/rate-limit` registration and why it keys on `request.ip` |
| [queue.md](./queue.md) | `src/bull/` — one queue and one worker per file, re-throw for retries |
| [imports-and-naming.md](./imports-and-naming.md) | Path aliases, import order, file and symbol naming |
| [commit.md](./commit.md) | Conventional Commits, the pre-commit hook, what never gets committed |

## How to use

- These rules complement `CLAUDE.md` — they don't replace it. When a rule and `CLAUDE.md` conflict,
  the **rule file wins** (it is more specific).
- Don't introduce a new pattern without updating the relevant rule first, and add any new rule to
  this index — [documentation.md](./documentation.md).
- Slash commands live in [`../commands/`](../commands/): `/commit`, `/audit-flow`, `/update-todo`.

## Known tensions between these rules

None open. Recorded so they are not reopened as drive-bys; a *new* tension is raised rather than
resolved silently ([contradiction-halt.md](./contradiction-halt.md)).

### Resolved: the status code for a uniqueness conflict

**422 everywhere.** Duplicate email (register, admin create/update, profile update), duplicate role
name and duplicate permission name all throw `UnprocessableEntityError`. A duplicate is a
well-formed request that fails a business rule. `BadRequestError` (400) stays for malformed input the
schema could not reject (unknown filter key, bad filter value, unknown sort reaching the repository),
for login failures, and for invalid verification/reset tokens.

### Resolved: where CRUD checks live

**The service owns existence and uniqueness checks; the repository only queries and returns `null`
on a miss.** See [services-crud.md](./services-crud.md) and [repositories.md](./repositories.md).

### Resolved: refresh tokens

This repo keeps `POST /auth/refresh` (owner decision 2026-10-31). Access tokens (1 day) and refresh
tokens (7 days) are signed with **different required secrets** and carry a `type` claim that each
side checks, so a refresh token is never accepted as a bearer token. See [rbac.md](./rbac.md).
