# Rule: Fastify app structure and layering

The framework-level contract: what each layer may do, how the app is assembled, and what already
exists. Per-file detail is in [handlers.md](./handlers.md), [services.md](./services.md) and
[repositories.md](./repositories.md).

## Layering

```
route handler (src/routes/<feature>/index.ts) -> service (src/services/) -> repository -> DB
```

- **Handler**: HTTP only — read the validated `request`, call **one** service method, wrap the result
  in `ResponseToolkit`. Authentication is the module hook; authorization is the route's `onRequest`
  guard ([rbac.md](./rbac.md)).
- **Service**: business rules, existence/uniqueness checks, transactions, cache invalidation, mail
  queueing. The only layer that opens a transaction.
- **Repository**: Drizzle queries, accepts `tx?`, returns `null` on a miss, never opens a transaction.

**Never skip a layer.** The one deliberate exception is `GET /health`, which runs `db.execute("SELECT 1")`
and `fastify.redis.ping()` as probes.

## Bootstrap (`src/app.ts`, entry `src/serve.ts`)

`createAppInstance()` registers everything **explicitly**, not autoloaded, so the same app runs
from source and from the `dist/` bundle, in this order:

1. `@fastify/jwt` (secret `JwtConfig.ACCESS_SECRET`) and `@fastify/redis`.
2. The Zod `validatorCompiler` / `serializerCompiler` from `fastify-type-provider-zod`.
3. `libs/fastify/plugins/externals/` — helmet, cors, i18n, rate-limit, swagger.
4. `libs/fastify/plugins/app/` — auth (`request.authenticate`), di (`fastify.di`), error
   (error and not-found handlers).
5. Route modules from the `routes` array, each with its URL prefix ([routes.md](./routes.md)).

`src/serve.ts` imports `reflect-metadata` first and listens on `0.0.0.0:APP_PORT`. The worker is a
separate process, `src/bull/index.ts` ([queue.md](./queue.md)).

## Config

Read configuration only through `@config`. `src/libs/config/env.config.ts` validates every variable
once with envalid; the config objects derive from it. **Never touch `process.env` outside
`src/libs/config/`** (`drizzle.config.ts` is the tooling exception). `JWT_SECRET` and
`JWT_REFRESH_SECRET` are required with no default, at least 32 characters, never a known placeholder
(the `jwtSecret` validator in `env.config.ts`), and must differ; token lifetimes (1d / 7d) live in
`JwtConfig`.

`fastify({ loggerInstance, bodyLimit })` comes first: the pino logger from `createLogger` (`@utils`)
writes to stdout and `storage/logs/app.log`, and request bodies are capped at 100 KB (413 above it).

## Reuse before you build

| Alias | Already there |
| --- | --- |
| `@utils` | `ResponseToolkit`, `createSuccessResponseSchema`, `createSuccessPaginationResponseSchema`, `NullSuccessResponseSchema`, `NullCreatedResponseSchema`, `buildDatatableQueryParamsSchema`, the error response schemas, `DatatableToolkit`, `Hash`, `StrToolkit`, `DateToolkit`, `logger` |
| `@fastify-libs` | `PermissionGuard`, `RoleGuard`, the error classes, `StrongPassword`, `paginationLength`, `defaultSort`, token lifetimes, `injectable`, `container` |
| `@services` | `SessionService` (cached `UserInformation`, invalidation), `AuthMailService` (tokens + auth mail) |
| `@cache` | `Cache`, `UserInformationCacheKey`, `RefreshTokenCacheKey`, `PermissionSelectOptionsCacheKey`, `RoleSelectOptionsCacheKey` |
| `@types` | `DatatableType`, `FilterField`, `PaginationResponse`, per-entity DTOs |

## Don't

- Don't register a global concern from a route file — it belongs in a plugin bucket.
- Don't send a reply from a hook or guard to refuse a request — throw ([middleware.md](./middleware.md)).
- Don't restructure into another framework's module layout; this repo's split is routes / services /
  repositories.
