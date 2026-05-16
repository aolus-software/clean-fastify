# Rule: OpenAPI / Swagger documentation

The API spec is generated at runtime from Fastify route metadata by `swagger.plugin.ts` (`src/libs/fastify/plugins/externals/swagger.plugin.ts`), which combines:

- `@fastify/swagger` — collects schemas
- `fastify-type-provider-zod` (`jsonSchemaTransform`) — converts Zod → JSON Schema
- `@scalar/fastify-api-reference` — renders the spec at `/docs` (and `/documentation`)

The raw JSON spec is at `/documentation/json`. You **do not** write OpenAPI YAML by hand — every field in the spec comes from how routes are declared.

## Mandatory per-route metadata

Every `fastify.get / .post / .patch / .delete` MUST declare a `schema` object containing:

1. **Validation schemas** — `body`, `query`, `params` as applicable. These are Zod schemas from the module's `./schema.ts` and feed both runtime validation **and** the spec.
2. **`response`** — a map keyed by status code, each pointing at a Zod schema. Include every code the route can legitimately return:
   - `200` for successful GET/PATCH, `201` for POST that creates
   - `400` if input validation can fail in the service layer (e.g. duplicate email)
   - `401` if the route uses `request.authenticate` in `preHandler`
   - `403` if `requireRoles` / `requirePermissions` runs
   - `404` if any path param resolves to a row that may not exist
   - `422` for business-rule violations (`UnprocessableEntityError`)
   - `500` so consumers know the shape on unexpected failure
3. **`tags`** — single-element array. Top-level resources → single word (`"Auth"`, `"Profile"`, `"Health"`). Nested resources → `"Group/Subresource"` (`"Settings/Users"`, `"Settings/Roles"`).
4. **`description`** — explains the auth/permission requirement and the side effects.

Example (from `routes/auth/index.ts`):

```ts
fastify.post(
	"/login",
	{
		schema: {
			tags: ["Auth"],
			description: "User login endpoint.",
			body: LoginBodySchema,
			response: {
				200: LoginResponseSchema,
				401: UnauthorizedResponseSchema,
				422: ValidationErrorResponseSchema,
				500: ServerErrorResponseSchema,
			},
		},
	},
	async (request, reply) => {
		/* ... */
	},
);
```

## Zod schemas — what the spec needs

- Every field in a request/response schema gets `.describe(...)`. The Scalar UI renders descriptions next to each property.
- Use Zod's semantic refinements where possible: `z.string().email()`, `z.string().uuid()`, `z.string().datetime()` — they all transform into the right `format` in the resulting JSON Schema.
- Reuse domain enums from `@database` (e.g. `z.nativeEnum(UserStatusEnum)`), not a fresh `z.enum(["active", ...])`.
- Strong-password fields use `.regex(StrongPassword)` from `@fastify-libs`.
- **Wrap response data** with `createSuccessResponseSchema(<DataSchema>)` or `createSuccessPaginationResponseSchema(<DataSchema>)` from `@utils`. `ResponseToolkit.success(...)` always serialises as `{ status, success, message, data }`, so the schema must wrap accordingly — using the raw `DataSchema` directly will fail serialisation.
- Use the **pre-built** error schemas in `@utils`: `UnauthorizedResponseSchema`, `ForbiddenResponseSchema`, `NotFoundResponseSchema`, `BadRequestResponseSchema`, `ValidationErrorResponseSchema`, `ServerErrorResponseSchema`. Never inline error shapes per-route.

## Auth and security

`swagger.plugin.ts` registers a `BearerAuth` security scheme (HTTP, `bearer`, JWT). To mark a route as requiring auth in the spec, add `security` inside `schema`:

```ts
schema: {
  tags: ["Settings/Users"],
  description: "List users. Requires 'user list' permission.",
  security: [{ BearerAuth: [] }],
  // ...
}
```

Public routes (`/auth/login`, `/auth/register`, `/health`, `/`) omit `security` entirely. Don't set it globally — keep it explicit per protected route so the spec matches actual `preHandler` wiring.

## Runtime behaviour

- Swagger and Scalar are registered for every environment in the current setup. If you add an "off in production" toggle, do it in `swagger.plugin.ts` — never disable the plugin by deleting its file.
- The plugin runs as part of the **externals** autoload bucket (`src/libs/fastify/plugins/externals/`). Don't move it — order matters: helmet, cors, rate-limit, swagger run before app plugins (auth, di, error).

## Don't

- Don't hand-edit any `openapi.json` — none is checked in; the spec is in-memory.
- Don't add `tags` per-route as an arbitrary string. The same casing must be reused so Swagger groups related endpoints.
- Don't omit response codes that the route can actually return — the spec lies to consumers if you do.
- Don't pass a non-Zod schema (Ajv JSON Schema object, TypeBox, etc.) to a route's `schema.body` / `schema.response`. The validator and serializer compilers are wired exclusively to Zod via `fastify-type-provider-zod`.
- Don't return `ResponseToolkit.success(data)` while declaring `response: { 200: RawDataSchema }`. Always wrap with `createSuccessResponseSchema(RawDataSchema)`.
