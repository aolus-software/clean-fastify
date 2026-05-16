# Rule: Feature modules (`src/routes/<name>/` + `src/services/`)

Unlike "co-located module" patterns (clean-elysia / clean-hono), clean-fastify splits a feature across **three layers**:

```
src/routes/<feature>/
├── index.ts     # default-exported (fastify) => { ... } registering routes
└── schema.ts    # Zod request/response schemas

src/services/
└── <feature>.service.ts   # @injectable() class containing business logic

src/libs/database/postgres/repositories/
└── <entity>.repository.ts # @injectable() class wrapping Drizzle queries
```

Nested groups (`settings/user/`, `settings/role/`) follow the same layout under `src/routes/settings/<sub>/`. The parent `src/routes/settings/index.ts` only registers the group prefix — no inline routes.

Routes are picked up automatically by `@fastify/autoload` (configured in `src/app.ts`); the **folder name is the URL prefix**. You do not `.use(...)` modules anywhere — just create the folder.

---

## `routes/<feature>/index.ts` — the routes layer

- Export a `default function (fastify: FastifyInstance) { ... }`. `@fastify/autoload` invokes it and binds the folder name as the prefix.
- Handler bodies destructure request fields explicitly (`const { email, password } = request.body as { ... }`) — or use the Zod-inferred type from `request.body` when the schema is wired.
- Resolve services via the DI container: `const authService = fastify.di.resolve(AuthService)`. Never `new AuthService(...)`.
- Wrap **every** successful response through `ResponseToolkit.success(reply, data, message, statusCode)` (or `.created`, `.error`, `.notFound`). Don't hand-craft `{ status, success, data }` payloads or call `reply.send(...)` with a raw object.
- Throw `BadRequestError` / `UnprocessableEntityError` / `NotFoundError` / `UnauthorizedError` / `ForbiddenError` / `ConflictError` from `@fastify-libs`. The `error.plugin.ts` handler translates them into the standard error envelope — never `reply.status(4xx).send(...)` directly.
- Protect routes by adding a `preHandler`:
  ```ts
  fastify.get("/", {
    schema: { ... },
    preHandler: async (request, reply) => {
      await request.authenticate(reply);
      request.requirePermissions(["user list"], reply);
    },
  }, async (request, reply) => { ... });
  ```
  `request.authenticate` must run first — it hydrates `request.userInformation` from Redis/DB. `requireRoles([...])` and `requirePermissions([...])` come from the authorization plugin and short-circuit with 401/403 when the user fails the check. Users with role `superuser` bypass all role/permission checks.
- Every route **must** declare `schema.body` / `schema.query` / `schema.params` where applicable and a `schema.response` map keyed by status code. Include every code the route can legitimately return (`200`/`201`, `401` when authenticated, `403` when guarded, `404` for `:id` routes, `422` for business-rule failures, `500`). Always reference shared schemas (`ValidationErrorResponseSchema`, `UnauthorizedResponseSchema`, `ServerErrorResponseSchema`) from `@utils` — never inline error shapes.
- Every route needs `schema.tags` (single string array — `["Auth"]`, `["Settings/Users"]`) and `schema.description`. These flow into the OpenAPI spec at `/documentation` and `/reference`.
- Group routes inside the file with comment banners that match the existing style in `auth/index.ts`:
  ```ts
  // ======================
  // POST: /auth/login
  // ======================
  ```
  No per-handler JSDoc — Swagger reads `schema.description`.

## `routes/<feature>/schema.ts` — Zod schemas

- Pure Zod. The app's type provider is `fastify-type-provider-zod`; schemas are validated at runtime **and** transformed into OpenAPI by `jsonSchemaTransform`.
- Every field gets `.describe(...)` and (where the field has a finite domain) `.examples(...)` or `.default(...)`. Both feed Swagger / Scalar.
- Reuse domain enums from `@database` (`UserStatusEnum`, etc.) via `z.nativeEnum(UserStatusEnum)` — don't redeclare unions.
- Reuse cross-feature constants from `@fastify-libs`: password regexes (`StrongPassword`), pagination defaults (`paginationLength`, `defaultSort`), token lifetimes (`verificationTokenLifetime`).
- For response bodies, wrap data with `createSuccessResponseSchema(...)` or `createSuccessPaginationResponseSchema(...)` from `@utils`. Re-export common error schemas (`UnauthorizedResponseSchema`, `ValidationErrorResponseSchema`, `ServerErrorResponseSchema`) at the bottom of `schema.ts` so the route file imports both from one place.
- Naming: `<Entity>BodySchema`, `<Entity>QuerySchema`, `<Entity>ParamsSchema`, `<Action>ResponseSchema`.

## `services/<feature>.service.ts` — business logic

- Export an `@injectable()` **class** (not a plain object) — DI requires the class for constructor injection:
  ```ts
  @injectable()
  export class FooService {
    constructor(
      private _userRepository: UserRepository,
      private _otherRepository: OtherRepository,
    ) {}

    async doThing(...) { ... }
  }
  ```
- Services own orchestration: state-dependent validation, transactions, cache invalidation, queue dispatch. They call repository methods through the injected instance (`this._userRepository.findByEmail(...)`).
- Wrap multi-step mutations in `db.transaction(async (tx) => { ... })` and pass `tx` down: `this._userRepository.create(data, tx)`. Anything that writes to ≥2 tables needs a transaction.
- Throw `UnprocessableEntityError` (with the `field/message` validation list) for business-rule failures. `NotFoundError` for missing entities. `BadRequestError` for malformed-but-not-validation-layer input.
- Cache invalidation: when mutating user data, drop `UserInformationCacheKey(userId)` from Redis (or refresh it) so the auth plugin sees the new value on the next request.
- Log with structured `logger` from `@utils` — `logger.info({ userId }, "User logged in")`. Never `console.*` (ESLint warns).
- Dispatch background jobs by importing the queue from `@bull/queue/...` and calling `await queue.add("job-name", payload)`. Producers live in services, never in route handlers directly.
- Register the service export from `src/services/index.ts` so route files can import it via `@services`.
