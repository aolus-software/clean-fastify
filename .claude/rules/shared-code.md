# Rule: Shared code lives in `src/libs/`

If a piece of code is used by **more than one route module** — or could plausibly be reused — it does
not live inside `src/routes/`. `src/routes/<feature>/` holds that feature's route file and Zod schemas
only. Services (`src/services/`) and repositories sit one layer up because routes, the worker, and
scripts reuse them.

## The buckets

| Bucket | Alias | Belongs here |
| --- | --- | --- |
| `libs/cache/` | `@cache` | `Cache` (`get`/`set`/`delete`/`deleteMany`), key builders `UserInformationCacheKey`, `RefreshTokenCacheKey`, `PermissionSelectOptionsCacheKey`, `RoleSelectOptionsCacheKey`, TTLs `UserInformationCacheTtl`, `SelectOptionsCacheTtl` |
| `libs/config/` | `@config` | `env.config.ts` (the only `process.env` reader) and `AppConfig`, `JwtConfig`, `DatabaseConfig`, `RedisConfig`, `MailConfig`, `corsConfig`, `clickhouseConfig` |
| `libs/database/` | `@database` | `db`, `client`, Drizzle tables and `UserStatus`, repository classes and their exported allow-lists, `DbTransaction`, `RedisClient`, ClickHouse client |
| `libs/fastify/default/` | `@fastify-libs` | `StrongPassword`, `paginationLength`, `defaultSort`, token-lifetime functions, upload limits |
| `libs/fastify/error/` | `@fastify-libs` | `HttpError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `UnprocessableEntityError`, `InternalServerError` |
| `libs/fastify/guards/` | `@fastify-libs` | `PermissionGuard`, `RoleGuard` (route-level `onRequest` hooks) |
| `libs/fastify/di/` | `@fastify-libs` | tsyringe re-exports: `container`, `injectable`, `inject`, `singleton`, `scoped` |
| `libs/fastify/plugins/` | *(none — registered in `app.ts`)* | `externals/` (helmet, cors, i18n, rate-limit, swagger) and `app/` (auth, di, error); see [middleware.md](./middleware.md) |
| `libs/i18n/` | `@i18n` | `t`, `translate`, locale store, catalogues, generated key union |
| `libs/mail/` | `@libs/mail/...` | `EmailService`, transport, templates |
| `libs/types/` | `@types` | DTOs (`UserInformation`, `UserList`, ...), `DatatableType`, `FilterField`, `PaginationResponse` |
| `libs/utils/` | `@utils` | `ResponseToolkit`, response/query schema builders, `UserInformationSchema`, `DatatableToolkit`, `Hash`, `EncryptionToolkit`, `StrToolkit`, `DateToolkit`, `NumberToolkit`, `logger` |
| `services/` | `@services` | `@injectable()` services: `AuthService`, `AuthMailService`, `SessionService`, `ProfileService`, `UserService`, `RoleService`, `PermissionService`, `SelectOptionService` |
| `bull/` | `@bull` | queues, workers, the worker entry |

`libs/fastify/` is re-exported through the single `@fastify-libs` barrel — except the plugins, which
only `src/app.ts` imports.

## Hard rules

1. **No relative imports across route folders.** A schema two routes need goes to `@utils` (as
   `UserInformationSchema` does) or `@types`.
2. **Files in `src/routes/<feature>/` are imported only by siblings.**
3. **Import through aliases**, never `../../libs/...`.
4. **Every bucket has an `index.ts` barrel**; a new file is added to it or the alias won't resolve it.

## Decision flow

1. One route only, ever? → that route's folder.
2. Business logic reused across routes, the worker, or a script? → `src/services/`.
3. Data access? → a repository under `libs/database/postgres/repositories/`, exported from the barrel.
4. Cross-cutting (auth, errors, cache, mail, response shaping)? → the matching `libs/` bucket.
5. Nothing fits? Prefer `@utils` or `@fastify-libs/default` over a new bucket; a new bucket means a new
   `tsconfig.json` path, barrel, and rule update.

## Don't

- Don't deep-import (`@utils/fastify/response`) when the barrel re-exports the symbol.
- Don't duplicate a helper across routes "for now".
- Don't add a new top-level `src/` folder for shared code.
