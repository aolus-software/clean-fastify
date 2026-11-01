# Documentation Upkeep Rule

## Principle: docs are part of the change, not an afterthought

When a change makes a documentation file wrong, fixing that doc belongs to the **same change**. If
nothing a doc covers changed, leave it alone. This is about keeping existing docs true, not about
inventing new `.md` files nobody asked for.

## Docs that must stay in sync

| Doc | Update it when… |
|---|---|
| `README.md` | setup steps, `package.json` scripts, env vars, `Makefile` targets, the Docker section, or the architecture summary change |
| `CLAUDE.md` | a path alias, the bootstrap order, the layering, a convention, a `docs/` reference, or a new runtime surface changes |
| `Makefile` | a command is added, renamed, or removed — the `.PHONY` line, the `help:` block and the recipe move together, plus `README.md` |
| `Dockerfile`, `docker-compose.yml` | a stage, service, port, or volume changes — `docker-migrate` / `docker-seed` build the `migrator` stage and join `$(DOCKER_NETWORK)` |
| `.env.example` | any env var is added, renamed, or removed — values must be copyable (no `VAR=` for a validator that rejects `""`) |
| `src/libs/config/env.config.ts` | a new env var is read — it is validated there or nowhere; then `.env.example` and `docs/CONFIGURATION.md` |
| `src/libs/database/postgres/schema/**` + `migrations/` | a table, column, enum, or index changes — `bun run db:generate`, review the SQL; seeds move with it |
| `src/libs/database/seed/**` | the permission catalogue or baseline roles/users change — guard strings must still match |
| `docs/API_DOCUMENTATION.md` | a route is added, renamed, re-gated, or removed, or a request/response shape changes |
| `docs/CONFIGURATION.md` | the env reference drifts from `env.config.ts` / `.env.example` |
| `docs/DEPLOYMENT.md` | the Docker/compose flow, the migrator image, or the deploy sequence changes |
| `docs/ERROR_HANDLING.md` | an error class or the error plugin's mapping / envelope changes |
| `docs/PLUGINS.md` | a plugin is added to or removed from `src/libs/fastify/plugins/`, or `app.ts` order changes |
| `docs/SECURITY.md` | auth, tokens, guards, rate limiting, CORS, headers, or the docs gate change |
| `docs/README.md` | a file is added to or removed from `docs/` |
| `src/libs/i18n/locales/{en,id}.json` | a user-facing string is added — both languages, then `bun run i18n:keys` |
| `tsconfig.json` `paths` | an alias is added — `CLAUDE.md`, [imports-and-naming.md](./imports-and-naming.md) and [shared-code.md](./shared-code.md) match it |
| `.claude/rules/*.md` | a coded convention changes or a new pattern ships with no rule — and [README.md](./README.md) indexes it |
| `.claude/rules/routes.md` | any route is added, renamed, or re-gated — the live route map |
| `.claude/commands/*.md` | a command's workflow or scope changes |
| `.github/copilot-instructions.md` | a convention it illustrates changes — it mirrors `CLAUDE.md` and drifts silently |

## What "up to date" means

- **Exact facts.** Aliases, route paths, table and column names, env var names, permission strings,
  scripts and `make` targets match reality.
- **No orphan references** to renamed or deleted files, functions, permissions, or rules.
- **Permission strings are quoted verbatim** — space-separated `"<group> <action>"`, e.g.
  `"user list"`, as `permission.seed.ts` generates them.
- **The OpenAPI spec is documentation.** A route with no `tags`, `summary`, `description`, or a
  `response` map missing a status it can return is an incomplete change ([openapi.md](./openapi.md)).
- **Barrel exports are part of the contract** ([shared-code.md](./shared-code.md)).

## When a doc is wrong but your task didn't cause it

Report it ([contradiction-halt.md](./contradiction-halt.md)) rather than silently rewriting unrelated
docs.
