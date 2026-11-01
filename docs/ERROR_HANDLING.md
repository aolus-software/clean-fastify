# Error Handling

Handlers and services **throw**; one error handler turns every failure into the standard envelope.
Nothing builds an error response by hand.

- Error classes: `src/libs/fastify/error/` (exported from `@fastify-libs`)
- Mapping: `src/libs/fastify/plugins/app/error.plugin.ts` (`setErrorHandler` and `setNotFoundHandler`)
- Envelope helpers: `ResponseToolkit` in `src/libs/utils/fastify/response.ts`
- Response schemas for docs: `src/libs/utils/fastify/response-schema.ts`

## Envelopes

```jsonc
// with field detail (400 / 422)
{ "status": 422, "success": false, "message": "...", "errors": [ { "field": "email", "message": "..." } ] }

// without field detail (401 / 403 / 404 / 413 / 415 / 500 / 503)
{ "status": 404, "success": false, "message": "...", "data": null }

// rate limited (no data key)
{ "status": 429, "success": false, "message": "Too Many Requests" }
```

`errors` is always an array of `{ field, message }`. Every message is translated from the request's
`Accept-Language`.

## Error classes

All extend `HttpError(_statusCode, message, code)`.

| Class                                                  | Status | Body                                                                | Typical thrower                                                                                                                  |
| ------------------------------------------------------ | ------ | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `BadRequestError(message, validationErrors?)`          | 400    | `errors[]` when `validationErrors` is given, otherwise `data: null` | login failures, invalid tokens, `DatatableToolkit` (unknown sort reaching the repository, unknown filter key or value, bad date) |
| `UnauthorizedError(message)`                           | 401    | `data: null`                                                        | `request.authenticate()`, `/auth/refresh`                                                                                        |
| `ForbiddenError(message)`                              | 403    | `data: null`                                                        | `PermissionGuard`, `RoleGuard`                                                                                                   |
| `NotFoundError(message)`                               | 404    | `data: null`                                                        | services, for a missing `:id`                                                                                                    |
| `UnprocessableEntityError(message, validationErrors?)` | 422    | `errors[]`                                                          | services: uniqueness, unknown role/permission ids, wrong current password                                                        |
| `InternalServerError(message)`                         | 500    | `data: null`                                                        | available; nothing throws it today                                                                                               |

There is no 409 class: a uniqueness conflict is a 422.

## What `error.plugin.ts` does, in order

1. `UnprocessableEntityError` → 422 with its `validationErrors`.
2. `BadRequestError` carrying `validationErrors` → 400 with them.
3. Schema validation failure (Zod, via `fastify-type-provider-zod`) on body, params, or querystring → 422. Each issue becomes `{ field, message }`: the field is the issue path (`email`, `roleIds.0`),
   falling back to `general`; the message is translated by `translateValidationIssue` (`@i18n`).
4. Any other `HttpError` → its status, `data: null`.
5. `FST_ERR_CTP_BODY_TOO_LARGE` → 413; `FST_ERR_CTP_INVALID_MEDIA_TYPE` → 415.
6. Body parse failures (`FST_ERR_CTP_INVALID_JSON_BODY`, `FST_ERR_CTP_EMPTY_JSON_BODY`,
   `FST_ERR_CTP_INVALID_CONTENT_LENGTH`, `FST_ERR_CTP_INVALID_TYPE`, `FST_ERR_CTP_EMPTY_TYPE`,
   `FST_ERR_CTP_INVALID_PARSE_TYPE`, or a `SyntaxError`) → 400 with
   `errors: [{ field: "body", message }]`.
7. `statusCode === 429` (the rate limiter's error) → 429 without a `data` key.
8. Any other error with a 4xx `statusCode` → that status with a generic "Bad Request" message.
9. Everything else → logged with `request.log.error` and answered 500 with a generic message. The
   original message and stack never reach the client.

`setNotFoundHandler` answers an unmatched route with 404 `errors.routeNotFound`.

## Rules

- Throw the domain error; never `reply.status(4xx).send(...)` from a handler, hook, or guard. A hook
  that sends a reply and returns lets the request continue.
- `BadRequestError` and `UnprocessableEntityError` take a `[{ field, message }]` array even for one
  field.
- The service that throws owns the message; repositories return `null` and do not throw for a missing
  row or a duplicate.
- Catch a driver or library error only to log it and re-throw one of the classes above. Raw `pg`,
  `bcrypt`, or JWT messages must not reach a client.
- No secrets, tokens, hashes, SQL, or stack traces in `message` or `errors[]`.
- The enumeration-sensitive paths (`/auth/resend-verification`, `/auth/forgot-password`) return 200
  instead of throwing for an unknown or ineligible email.
- A new user-facing message is a key in both `src/libs/i18n/locales/en.json` and `id.json`, followed
  by `bun run i18n:keys`.
- A route's `schema.response` lists every status it can return, using the shared schemas from
  `@utils` (`BadRequestResponseSchema`, `UnauthorizedResponseSchema`, `ForbiddenResponseSchema`,
  `NotFoundResponseSchema`, `ValidationErrorResponseSchema`, `ServerErrorResponseSchema`,
  `ServiceUnavailableResponseSchema`). Fastify serializes error bodies through the matching schema, so
  a mismatched schema strips fields.
