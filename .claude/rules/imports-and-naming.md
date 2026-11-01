# Rule: Imports and naming

## Path aliases (`tsconfig.json` `paths`, resolved by Bun)

| Alias | Maps to |
| --- | --- |
| `@libs`, `@libs/*` | `src/libs/` |
| `@cache` | `src/libs/cache/` |
| `@config` | `src/libs/config/` |
| `@database` | `src/libs/database/` |
| `@fastify-libs` | `src/libs/fastify/` |
| `@i18n` | `src/libs/i18n/` |
| `@utils` | `src/libs/utils/` |
| `@types` | `src/libs/types/` |
| `@bull` | `src/bull/` |
| `@routes` | `src/routes/` |
| `@services` | `src/services/` |

Each alias also has a `/*` form. Rules:

- **Use the alias for anything outside the current folder**, and import from the bucket root
  (`@utils`, not `@utils/fastify/response`). Accepted deep imports: `@config/jwt.config` in `app.ts`,
  `@bull/queue/<job>.queue`, `@libs/mail/mail.service`.
- **Relative imports only inside one folder**: `./schema` in a route folder, `./session.service`
  between services, `"."` for `DbTransaction` inside repositories, `../error` inside
  `libs/fastify/guards` (avoids a barrel cycle).

## Import order — don't hand-sort

`simple-import-sort/imports` and `/exports` are errors, plus `import/first` and `import/no-duplicates`.
Run `bun run lint:fix`.

## File naming

kebab-case or the existing snake_case, with a role suffix:

| Kind | Pattern | Example |
| --- | --- | --- |
| Repository | `<entity>.repository.ts` | `email-verification.repository.ts` |
| Service | `<name>.service.ts` | `auth-mail.service.ts` |
| Plugin | `<concern>.plugin.ts` | `rate-limiting.plugin.ts` |
| Guard | `<name>.guard.ts` | `permission.guard.ts` |
| Config | `<area>.config.ts` | `env.config.ts` |
| Error class | `<name>.error.ts` | `bad-request.error.ts` |
| Queue / worker | `<job>.queue.ts` / `<job>.worker.ts` | `send-email.queue.ts` |
| Drizzle table | `<entity>.ts`, existing snake_case kept | `password_reset_token.ts`, `rbac.ts` |
| Route folder | `index.ts` + `schema.ts`, plural kebab folder | `settings/select-options/` |
| Seed | `<entity>.seed.ts` | `permission.seed.ts` |

## Symbol naming

- Tables: `<snake_plural>Table` (`usersTable`, `user_rolesTable`); relations `<name>Relations`.
- Enum: `userStatusEnum` (pgEnum), `UserStatus` (const object), `UserStatusEnum` (type).
- Classes: `PascalCaseRepository`, `PascalCaseService`, `PascalCaseToolkit`, `PascalCaseError`.
- Guards: `PermissionGuard`, `RoleGuard` — factories returning `onRequest` hooks.
- Zod schemas: PascalCase ending `Schema` ([validation.md](./validation.md)).
- Repository allow-lists: `<entity>SortableFields`, `<entity>FilterableFields`,
  `<entity>FilterExample`, `<entity>SearchColumns`.
- Cache keys: `<Concept>CacheKey` functions in `@cache`.
- Private constructor-injected members start with `_` (`_userRepository`).
