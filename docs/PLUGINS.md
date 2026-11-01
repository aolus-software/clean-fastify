# Plugins and Application Structure

How the Fastify instance is assembled, and what each plugin does.

## Entry points

- **API**: `src/serve.ts` imports `reflect-metadata`, calls `createAppInstance()` from `src/app.ts`,
  and listens on `0.0.0.0:APP_PORT`. It closes the app on `SIGTERM` / `SIGINT` and exits on an
  uncaught exception or unhandled rejection.
- **Worker**: `src/bull/index.ts` imports `reflect-metadata` and the worker files for their side
  effects. It runs as its own process (`bun run dev:worker`, `start:worker`, or the compose `worker`
  service).

## Registration order (`src/app.ts`)

`createAppInstance()` builds a Fastify instance with the pino logger from `@utils` (`createLogger`,
writing to stdout and `storage/logs/app.log`), a 100 KB `bodyLimit` (larger bodies get 413) and the
Zod type provider, then registers, in order:

1. **`@fastify/jwt`** with `JwtConfig.ACCESS_SECRET` (`JWT_SECRET`). Refresh tokens are signed and
   verified by passing `JwtConfig.REFRESH_SECRET` explicitly (`AuthService`).
2. **`@fastify/redis`** from `RedisConfig`, decorating `fastify.redis` (used by the rate limiter and
   the health probe).
3. **Zod compilers**: `validatorCompiler` and `serializerCompiler` from `fastify-type-provider-zod`.
4. **The `src/libs/fastify/plugins/externals/` plugins**, imported and registered one by one.
5. **The `src/libs/fastify/plugins/app/` plugins**, likewise.
6. **Route modules**: each entry of the `routes` array (`src/routes/<feature>/index.ts`, which
   default-exports `(fastify) => { ... }`) with its URL prefix.

Nothing is autoloaded from the file system, so the bundled `dist/serve.js` boots the same app as
`src/serve.ts`.

Each plugin file default-exports a function wrapped in `fastify-plugin`, so its decorators and hooks
apply to the whole app rather than an encapsulated child. Only `src/app.ts` imports a plugin; a new
plugin file is added there in its bucket's block.

## `externals/` — third-party integrations

| File                      | Name                   | Does                                                                                                                                                                                                                                                     |
| ------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `helmet.plugin.ts`        | `helmet-plugin`        | `@fastify/helmet`: CSP, HSTS, `nosniff`, referrer policy, hides `X-Powered-By`                                                                                                                                                                           |
| `cors.plugin.ts`          | `cors-plugin`          | `@fastify/cors` from `corsConfig`: origins from `ALLOWED_HOST` (empty = any), methods `GET, POST, PATCH, DELETE`                                                                                                                                         |
| `i18n.plugin.ts`          | `i18n-plugin`          | `onRequest`: resolves the locale from `Accept-Language` (`en`, `id`) into `request.locale` and the async locale store; `onSend`: sets `Content-Language`                                                                                                 |
| `rate-limiting.plugin.ts` | `rate-limiting-plugin` | `@fastify/rate-limit`, global, 100 per minute, Redis store, keyed on `request.ip`; depends on `@fastify/redis`                                                                                                                                           |
| `swagger.plugin.ts`       | `swagger-plugin`       | Only when `ENABLE_API_DOCS=true`: `@fastify/swagger` with `jsonSchemaTransform` (Zod to OpenAPI), a `BearerAuth` scheme and an `Accept-Language` parameter on every operation, plus the Scalar reference at `/docs` and the spec at `/docs/openapi.json` |

## `app/` — application plugins

| File              | Name          | Does                                                                                                                                                                                         |
| ----------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.plugin.ts`  | `auth-plugin` | Decorates `request.authenticate()`: verifies the bearer access token (`type: "access"`), loads `request.userInformation` through `SessionService`, throws `UnauthorizedError` on any failure |
| `di.plugin.ts`    | `di-plugin`   | Decorates `fastify.di` with the tsyringe `container`; handlers call `fastify.di.resolve(Service)`                                                                                            |
| `error.plugin.ts` | —             | `setErrorHandler` and `setNotFoundHandler`; see [ERROR_HANDLING.md](./ERROR_HANDLING.md)                                                                                                     |

## Guards are not plugins

`PermissionGuard` and `RoleGuard` (`src/libs/fastify/guards/`, exported from `@fastify-libs`) are
factories returning `onRequest` hooks. A protected route file looks like:

```ts
export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.addHook("onRequest", async (request) => {
		await request.authenticate();
	});

	app.get(
		"",
		{
			onRequest: PermissionGuard(["role list"]),
			schema: {/* ... */},
		},
		async (request, reply) => {
			/* ... */
		},
	);
}
```

The module hook runs before route-level hooks, so `request.userInformation` is set when the guard
runs. Both throw, so a refused request never reaches body parsing, validation, or the handler.

## Adding a plugin

1. Create `<concern>.plugin.ts` in `externals/` (wraps a library) or `app/` (app behaviour).
2. `export default fp(async (fastify) => { ... }, { name: "<concern>-plugin" })`, declaring
   `dependencies` on any plugin it needs.
3. Refuse requests by throwing an error class, never by sending a reply from a hook.
4. Update this file and `.claude/rules/middleware.md`.
