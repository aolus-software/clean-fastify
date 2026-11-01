# Rule: Errors and responses

One envelope, one error vocabulary. Handlers build success responses with `ResponseToolkit`
(`@utils`); failures are **thrown** and the error plugin
(`src/libs/fastify/plugins/app/error.plugin.ts`) turns them into HTTP.

## The envelope

`status` is inside the body **and** is the HTTP status.

```jsonc
// success
{ "status": 200, "success": true, "message": "…", "data": { } }        // or "data": null

// list
{ "status": 200, "success": true, "message": "…",
  "data": { "data": [], "meta": { "page": 1, "limit": 10, "totalCount": 42 } } }

// 400 / 422 with field detail
{ "status": 422, "success": false, "message": "…", "errors": [{ "field": "email", "message": "…" }] }

// 401 / 403 / 404 / 413 / 415 / 500 / 503
{ "status": 404, "success": false, "message": "…", "data": null }

// 429 (rate limiter) — no data key
{ "status": 429, "success": false, "message": "…" }
```

`meta` is exactly `{ page, limit, totalCount }`; the request param is `perPage`, the meta key is
`limit`. Deletes return 200 with a body, never 204.

## `ResponseToolkit`

```ts
ResponseToolkit.success(reply, data, message, status = 200)
ResponseToolkit.error(reply, message, status)            // data: null
ResponseToolkit.validationError(reply, errors, message, status = 422)
```

Handlers call `success` only. `error` / `validationError` are for the error plugin, the not-found
handler and the health route's 503.

## The error classes (`src/libs/fastify/error/`, exported from `@fastify-libs`)

| Class | Status | Body |
| --- | --- | --- |
| `BadRequestError(message, errors?)` | 400 | `errors[]` when given, else `data: null` |
| `UnauthorizedError` | 401 | `data: null` |
| `ForbiddenError` | 403 | `data: null` |
| `NotFoundError` | 404 | `data: null` |
| `UnprocessableEntityError(message, errors)` | 422 | `errors[]` |
| `InternalServerError` | 500 | `data: null` |

There is no 409 class: a uniqueness conflict is a 422.

## What the error plugin maps

- Zod validation failure (`error.validation`) → 422, one `{ field, message }` per issue, messages
  through `translateValidationIssue`; `field` is the JSON path, fallback `"general"`.
- Unparseable body (`FST_ERR_CTP_INVALID_JSON_BODY` and siblings) → 400,
  `errors: [{ field: "body", … }]`.
- Body too large → 413; unsupported media type → 415.
- Status 429 → the limiter's body above.
- Unknown route → 404 (`setNotFoundHandler`).
- Any other 4xx → that status with `errors.badRequest`; anything else → 500, logged.

## Status per case

| Case | Status |
| --- | --- |
| Missing/invalid/expired token, wrong token type, user missing/inactive/deleted | 401 |
| Guard refuses | 403 |
| `:id` not found | 404 |
| Request shape, bad sort/page, non-uuid `:id` | 422 |
| Uniqueness (email, role name, permission name), unknown `roleIds`/`permissionIds` | 422 |
| Unknown filter key, bad filter value, bad date filter | 400 |
| Login failure (unknown email, wrong password, unverified, inactive) | 400, `errors[{field:"email"}]` |
| Invalid/expired/used verify or reset token | 400, `errors[{field:"token"}]` |
| Invalid refresh token | 401 |

## Rules

- Never hand-build the envelope, never `reply.status(4xx).send(...)` from a handler.
- Throw the domain error, not a library's; raw `pg`/`bcrypt` messages never reach a client.
- No secrets, hashes, tokens, SQL or stack traces in `message` or `errors[]`.
- Every message is an i18n key ([i18n.md](./i18n.md)).
- A route's `response` map lists exactly the statuses it can produce.
