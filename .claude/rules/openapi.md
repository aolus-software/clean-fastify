# Rule: OpenAPI documentation

The spec is generated at runtime from route metadata by
`src/libs/fastify/plugins/externals/swagger.plugin.ts`: `@fastify/swagger` collects the route schemas,
`jsonSchemaTransform` converts Zod to JSON Schema, and `@scalar/fastify-api-reference` serves the UI.
Nothing is hand-written.

## The gate

Docs are registered **only when `ENABLE_API_DOCS=true`**. The flag defaults to `false` and is
independent of `NODE_ENV`, so an environment that never sets it cannot expose the schema. When on:

- `GET /docs` — Scalar UI (redirects to `/docs/`)
- `GET /docs/openapi.json` — the spec

Don't add a second switch (an `APP_ENV !== "production"` check) beside the flag.

## Per-route metadata

Every route's `schema` declares:

1. **Validation schemas** — `body`, `querystring`, `params` from `./schema.ts`.
2. **`response`** — a status-keyed map listing every status the route can return, each an envelope
   schema from `@utils` ([errors-and-responses.md](./errors-and-responses.md)).
3. **`tags`** — `["General"]`, `["Auth"]`, `["Profile"]`, `["Settings/Users"]`, `["Settings/Roles"]`,
   `["Settings/Permissions"]`, `["Settings/Select Options"]`. Reuse the exact casing.
4. **`summary`** (short) and **`description`** naming the permission requirement and side effects.
5. **`security: [{ BearerAuth: [] }]`** on every protected route. Public routes omit it.

The plugin also attaches an `Accept-Language` header parameter (`en` | `id`) to every operation.

## Don't

- Don't hand-edit or commit an `openapi.json`.
- Don't omit a status the route can return, or list one it cannot.
- Don't pass a non-Zod schema to `schema.body` / `schema.response`.
- Don't declare a raw data schema as a response — the handler always sends the envelope.
