# Rule: Plugins and hooks (`src/libs/fastify/plugins/`)

Cross-cutting behaviour is a Fastify plugin wrapped in `fastify-plugin` (so it is not encapsulated)
and registered **explicitly** in `src/app.ts`, in the order below. Nothing else imports a plugin.

## The buckets

| Bucket | File | `fp` name | Does |
| --- | --- | --- | --- |
| `externals/` | `helmet.plugin.ts` | `helmet-plugin` | security headers and CSP |
| | `cors.plugin.ts` | `cors-plugin` | `@fastify/cors` from `corsConfig` (`ALLOWED_HOST`; empty = any origin) |
| | `i18n.plugin.ts` | `i18n-plugin` | locale from `Accept-Language`, `Content-Language` header |
| | `rate-limiting.plugin.ts` | `rate-limiting-plugin` | global limiter ([rate-limiting.md](./rate-limiting.md)) |
| | `swagger.plugin.ts` | `swagger-plugin` | spec + Scalar at `/docs`, only when `ENABLE_API_DOCS` ([openapi.md](./openapi.md)) |
| `app/` | `auth.plugin.ts` | `auth-plugin` | decorates `request.authenticate()` |
| | `di.plugin.ts` | `di-plugin` | decorates `fastify.di` (the tsyringe container) |
| | `error.plugin.ts` | *(unnamed)* | `setErrorHandler` and `setNotFoundHandler` ([errors-and-responses.md](./errors-and-responses.md)) |

`externals/` loads before `app/`, which loads before `routes/`. A plugin that depends on another
declares it (`dependencies: ["@fastify/redis"]`).

## `authenticate` throws

`request.authenticate()` verifies the bearer token with `JWT_SECRET`, requires `type: "access"`, and
loads `UserInformation` through `SessionService` (Redis first, then a DB read that only returns live,
active users). Any failure **throws** `UnauthorizedError`, so a module hook calling it stops the
request:

```ts
app.addHook("onRequest", async (request) => {
	await request.authenticate();
});
```

Guards (`PermissionGuard`, `RoleGuard` in `libs/fastify/guards/`) are not plugins: they are hook
factories attached per route with `onRequest:`. Route-level hooks run after the module hook, so
`request.userInformation` is set when they run ([rbac.md](./rbac.md)).

## Rules

- A new plugin is `<concern>.plugin.ts` in the right bucket, exports `default fp(async (fastify) => …, { name })`.
- Refuse a request by **throwing** one of the error classes. A hook that calls `reply.send(...)` and
  returns lets the request continue to the handler — that was how the old guards failed open.
- No business logic in a plugin, and no per-request state on a module-level variable.
- Use `onRequest` for auth and guards so a refused request never pays for body parsing or validation.
