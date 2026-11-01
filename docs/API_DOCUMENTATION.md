# API Documentation

The HTTP contract of `clean-fastify`. The interactive reference at `/docs` (when
`ENABLE_API_DOCS=true`) is generated from the same route schemas and carries every field.

- No global prefix and no URL versioning.
- Collections are plural kebab-case; updates are `PATCH`, never `PUT`.
- Request and response bodies are JSON with **camelCase** field names (`createdAt`, `updatedAt`,
  `isAssigned`, `roleIds`, `permissionIds`). Enum values are lowercase (`active`, `inactive`,
  `suspended`, `blocked`).
- Messages are localised from `Accept-Language` (`en` default, `id`); the response carries
  `Content-Language`.

## Response envelope

`status` appears in the body and is also the HTTP status.

```jsonc
// success (200 / 201)
{ "status": 200, "success": true, "message": "Role detail fetched", "data": { } }

// success with nothing to return (create, update, delete, mail actions)
{ "status": 201, "success": true, "message": "Role created", "data": null }

// list
{
  "status": 200, "success": true, "message": "Users fetched",
  "data": { "data": [ ], "meta": { "page": 1, "limit": 10, "totalCount": 42 } }
}

// 400 / 422 with field detail
{
  "status": 422, "success": false, "message": "Request validation failed",
  "errors": [ { "field": "email", "message": "Expected a valid email address" } ]
}

// 401 / 403 / 404 / 413 / 415 / 500 / 503 without field detail
{ "status": 404, "success": false, "message": "User not found", "data": null }

// 429 from the rate limiter (no data key)
{ "status": 429, "success": false, "message": "Too Many Requests" }
```

- `errors` is always an **array** of `{ field, message }`. Schema failures use the field path
  (`email`, `roleIds.0`), falling back to `general`. A body that cannot be parsed is a 400 with
  `field: "body"`. Bad list input uses `sort` or `filter[<key>]`.
- `meta` is exactly `{ page, limit, totalCount }`. The request parameter is `perPage`; the meta key
  is `limit`.
- Deletes return 200 with a body, never 204.

## Authentication

Send the access token as `Authorization: Bearer <accessToken>`.

| Token   | Lifetime | Signed with          | `type` claim | Accepted by               |
| ------- | -------- | -------------------- | ------------ | ------------------------- |
| Access  | 1 day    | `JWT_SECRET`         | `access`     | every protected route     |
| Refresh | 7 days   | `JWT_REFRESH_SECRET` | `refresh`    | `POST /auth/refresh` only |

A refresh token presented as a bearer token is rejected (401): it fails the access signature check and
the `type` check. An access token sent to `/auth/refresh` is rejected the same way.

Flow:

1. `POST /auth/register` creates an unverified account and mails a verification link
   (`${CLIENT_URL}/auth/verify-email?token=...`, valid 1 hour).
2. `POST /auth/verify-email` consumes the token.
3. `POST /auth/login` returns `{ user, accessToken, refreshToken }`.
4. Before the access token expires, `POST /auth/refresh` with `{ refreshToken }` returns a new
   `{ accessToken, refreshToken }`. Only the most recently issued refresh token per user is valid:
   a refresh rotates it, and a new login replaces it.
5. Resetting a password (self-service or by a superuser), changing your own password, or being
   deleted ends the user's sessions: the cached identity and the stored refresh token are dropped.
   Existing access tokens stop working once the user is no longer active or not found; a password
   change alone does not invalidate an access token that is still within its lifetime.

Every authenticated request resolves the caller's `UserInformation`
(`{ id, name, email, roles: string[], permissions: string[] }`) from a 1-hour Redis cache, falling back
to the database. Only live (`deleted_at IS NULL`) and `active` users resolve; anyone else gets 401.
Writes that change a user's status, roles, role permissions, or deletion clear the affected cache
entries immediately.

## Route map

"Guard" is the route-level `onRequest` hook. Permission guards require every listed permission;
`superuser` bypasses both guard kinds. Permission strings are the seeded `<group> <action>` names.

| Method | Path                                            | Auth | Guard               | Body                                                                        | Success                                                                                          |
| ------ | ----------------------------------------------- | ---- | ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| GET    | `/`                                             | no   | —                   | —                                                                           | 200 `{ appName, appEnv, date }`                                                                  |
| GET    | `/health`                                       | no   | —                   | —                                                                           | 200 `{ status: "healthy", timestamp, services: { database, redis } }`; 503 if either probe fails |
| GET    | `/live`                                         | no   | —                   | —                                                                           | 200 `{ alive: true }`                                                                            |
| POST   | `/auth/login`                                   | no   | —                   | `email`, `password`                                                         | 200 `{ user, accessToken, refreshToken }`                                                        |
| POST   | `/auth/register`                                | no   | —                   | `name` (1-255), `email` (max 255), `password` (strong, min 8)               | 201 `null`                                                                                       |
| POST   | `/auth/resend-verification`                     | no   | —                   | `email`                                                                     | 200 `null` (always)                                                                              |
| POST   | `/auth/verify-email`                            | no   | —                   | `token`                                                                     | 200 `null`                                                                                       |
| POST   | `/auth/forgot-password`                         | no   | —                   | `email`                                                                     | 200 `null` (always)                                                                              |
| POST   | `/auth/reset-password`                          | no   | —                   | `token`, `newPassword` (strong, min 8)                                      | 200 `null`                                                                                       |
| POST   | `/auth/refresh`                                 | no   | —                   | `refreshToken`                                                              | 200 `{ accessToken, refreshToken }`                                                              |
| GET    | `/profile`                                      | yes  | — (own identity)    | —                                                                           | 200 `UserInformation`                                                                            |
| PATCH  | `/profile`                                      | yes  | — (own identity)    | `name` (1-255), `email` (max 255)                                           | 200 `UserInformation`                                                                            |
| PATCH  | `/profile/password`                             | yes  | — (own identity)    | `currentPassword`, `newPassword` (strong, min 8)                            | 200 `null`                                                                                       |
| GET    | `/settings/users`                               | yes  | `user list`         | query below                                                                 | 200 paginated `UserList`                                                                         |
| POST   | `/settings/users`                               | yes  | `user create`       | `name`, `email`, `password`, `status`, `remark` (string or null), `roleIds` | 201 `null`                                                                                       |
| GET    | `/settings/users/:id`                           | yes  | `user detail`       | —                                                                           | 200 `UserDetail`                                                                                 |
| PATCH  | `/settings/users/:id`                           | yes  | `user edit`         | `name`, `email`, `status`, `remark`, `roleIds` (full replace, no password)  | 200 `null`                                                                                       |
| DELETE | `/settings/users/:id`                           | yes  | `user delete`       | —                                                                           | 200 `null` (soft delete)                                                                         |
| POST   | `/settings/users/:id/reset-password`            | yes  | role `superuser`    | `newPassword` (strong, min 8)                                               | 200 `null`                                                                                       |
| POST   | `/settings/users/:id/send-verification-email`   | yes  | `user create`       | —                                                                           | 200 `null`                                                                                       |
| POST   | `/settings/users/:id/send-reset-password-email` | yes  | `user create`       | —                                                                           | 200 `null`                                                                                       |
| GET    | `/settings/roles`                               | yes  | `role list`         | query below                                                                 | 200 paginated `RoleList`                                                                         |
| POST   | `/settings/roles`                               | yes  | `role create`       | `name` (1-100), `permissionIds`                                             | 201 `null`                                                                                       |
| GET    | `/settings/roles/:id`                           | yes  | `role detail`       | —                                                                           | 200 `RoleDetail`                                                                                 |
| PATCH  | `/settings/roles/:id`                           | yes  | `role edit`         | `name`, `permissionIds` (full replace)                                      | 200 `null`                                                                                       |
| DELETE | `/settings/roles/:id`                           | yes  | `role delete`       | —                                                                           | 200 `null` (hard delete, grants and assignments cascade)                                         |
| GET    | `/settings/permissions`                         | yes  | `permission list`   | query below                                                                 | 200 paginated `PermissionList`                                                                   |
| POST   | `/settings/permissions`                         | yes  | `permission create` | `name` (string[] of actions, each 1-255), `group` (1-100)                   | 201 `null`                                                                                       |
| GET    | `/settings/permissions/:id`                     | yes  | `permission detail` | —                                                                           | 200 `PermissionList`                                                                             |
| PATCH  | `/settings/permissions/:id`                     | yes  | `permission edit`   | `name` (1-255, stored verbatim), `group` (1-100)                            | 200 `null`                                                                                       |
| DELETE | `/settings/permissions/:id`                     | yes  | `permission delete` | —                                                                           | 200 `null` (hard delete, grants cascade)                                                         |
| GET    | `/settings/select-options/permissions`          | yes  | role `superuser`    | —                                                                           | 200 `[{ group, permissions: [{ id, name, group }] }]`                                            |
| GET    | `/settings/select-options/roles`                | yes  | role `superuser`    | —                                                                           | 200 `[{ id, name }]`, excluding `superuser`, ordered by name                                     |

Plus `GET /docs` and `GET /docs/openapi.json` when `ENABLE_API_DOCS=true`.

Notes:

- `:id` is validated as a UUID; a malformed id is a 422 before anything runs.
- `POST /settings/permissions` stores one permission per action as `"<group> <action>"`, e.g.
  `{ "group": "invoice", "name": ["list", "create"] }` creates `invoice list` and `invoice create`.
  `PATCH` stores `name` verbatim, so send the full `"<group> <action>"` string.
- Strong password: at least 8 characters with an upper-case letter, a lower-case letter, a digit and a
  symbol.

### Response shapes

- `UserInformation` = `{ id, name, email, roles: string[], permissions: string[] }`
- `UserList` = `{ id, name, email, status, remark, roles: string[], createdAt, updatedAt }`
- `UserDetail` = `UserList` with `roles: [{ id, name }]`
- `RoleList` = `{ id, name, createdAt, updatedAt }`
- `RoleDetail` = `RoleList` plus `permissions: [{ group, names: [{ id, name, isAssigned }] }]` —
  every permission in the system, grouped, marked for this role
- `PermissionList` = `{ id, name, group, createdAt, updatedAt }`

## List query parameters

| Param                   | Type                                     | Default     | Invalid                                                             |
| ----------------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------------- |
| `page`                  | integer >= 1                             | `1`         | 422                                                                 |
| `perPage`               | integer 1-100                            | `10`        | 422                                                                 |
| `search`                | string                                   | —           | case-insensitive substring match over the resource's search columns |
| `sort`                  | one of the resource's sort keys          | `createdAt` | 422                                                                 |
| `sortDirection`         | `asc` or `desc`                          | `desc`      | 422                                                                 |
| `filter[<key>]=<value>` | separate flat query parameters, not JSON | —           | unknown key, out-of-range enum value, or bad date: 400              |

Several filters are ANDed together. What a comma means depends on the key:

| Key kind                        | Comma means            | Match                                                                                                       |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| enum (`status`)                 | several allowed values | `IN`, each value checked against the enum                                                                   |
| id (`roleId`)                   | several ids            | `IN`                                                                                                        |
| date (`createdAt`, `updatedAt`) | `start,end`            | inclusive, start of the first day to end of the last day in `APP_TIMEZONE`; one date matches that whole day |
| plain text                      | a literal comma        | case-insensitive substring                                                                                  |

| Resource    | Sort keys                                                 | Filter keys                                                                             | Search columns            |
| ----------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------- |
| users       | `id`, `name`, `email`, `status`, `createdAt`, `updatedAt` | `status` (enum), `name`, `email`, `roleId` (id), `createdAt` (date), `updatedAt` (date) | `name`, `email`, `status` |
| roles       | `id`, `name`, `createdAt`, `updatedAt`                    | `name`, `createdAt` (date), `updatedAt` (date)                                          | `name`                    |
| permissions | `id`, `name`, `group`, `createdAt`, `updatedAt`           | `name`, `group`, `createdAt` (date), `updatedAt` (date)                                 | `name`, `group`           |

Soft-deleted users never appear in lists or lookups.

Example:

```
GET /settings/users?page=2&perPage=20&sort=name&sortDirection=asc&filter[status]=active,suspended&filter[createdAt]=2026-01-01,2026-03-31
```

## Status codes

| Case                                                                                                            | Status                                    |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Missing, invalid, or expired bearer token; refresh token used as bearer; user missing, deleted, or not active   | 401                                       |
| Invalid, expired, or rotated refresh token on `/auth/refresh`                                                   | 401                                       |
| Guard refuses                                                                                                   | 403                                       |
| `:id` not found                                                                                                 | 404                                       |
| Unmatched route                                                                                                 | 404                                       |
| Request shape fails validation (body, params, `page`, `perPage`, `sort`, `sortDirection`)                       | 422                                       |
| Uniqueness conflict (email among live users, role name, permission name) or unknown `roleIds` / `permissionIds` | 422                                       |
| Wrong current password on `PATCH /profile/password`                                                             | 422                                       |
| Login failure (unknown email or wrong password, unverified email, inactive account)                             | 400, `errors[{ field: "email" }]`         |
| Invalid, expired, or used verification or reset token                                                           | 400, `errors[{ field: "token" }]`         |
| Unknown filter key, bad filter value or date                                                                    | 400, `errors[{ field: "filter[<key>]" }]` |
| Unparseable request body                                                                                        | 400, `errors[{ field: "body" }]`          |
| Body over the size limit                                                                                        | 413                                       |
| Unsupported content type                                                                                        | 415                                       |
| Rate limit exceeded                                                                                             | 429                                       |
| Health probe failed                                                                                             | 503                                       |
| Anything unexpected                                                                                             | 500 (logged)                              |

Login checks the password before any account state and answers an unknown email and a wrong password
with the same message, so the unverified and inactive messages are only reachable with a correct
password.

## Breaking changes from the previous clean-fastify contract

This contract replaces the one the repository shipped before its sync with the canonical base. Clients
of the old API must update:

- **Paths**: `/settings/user`, `/settings/role`, `/settings/permission`, `/settings/select` became
  `/settings/users`, `/settings/roles`, `/settings/permissions`, `/settings/select-options`. Path
  params are `:id` (was `:userId`, `:roleId`, `:permissionId`).
- **Methods**: every `PUT` became `PATCH` (`/profile`, `/settings/*/:id`).
- **Admin password reset**: `PATCH /settings/user/:userId/change-password` with `{ password }` became
  `POST /settings/users/:id/reset-password` with `{ newPassword }`, gated on the `superuser` role.
  New: `send-verification-email` and `send-reset-password-email` actions; `GET /live`.
- **Own password change**: `PATCH /profile/password` takes `{ currentPassword, newPassword }` (was
  `password`); a wrong current password is a 422 on `currentPassword`, and success ends every session.
- **Authorization is enforced**: every settings route now requires its permission; before, users and
  roles routes needed only a login and the superuser checks did not stop the handler.
- **Request bodies**: role `permission_ids` became `permissionIds` and is required; user create
  requires `status`, and `remark` is a required key (string or null) on create and update.
- **Response fields** are camelCase (`createdAt`, `updatedAt`, `isAssigned`); empty payloads are
  `data: null` instead of `{}`. `UserInformation.permissions` is a flat `string[]` of permission
  names, not `[{ name, permissions }]` per role. `/` returns `{ appName, appEnv, date }`; `/health`
  returns `{ status, timestamp, services: { database, redis } }` and no longer probes ClickHouse.
- **Errors**: login and token failures are 400 (were 422); refresh failures are 401 (were 422); every
  field error is `{ field, message }`; 401/403/404/500 carry `data: null`.
- **Lists**: page size is `perPage` (the old `limit` parameter is gone); filters are
  `filter[<key>]=<value>` and now actually apply; sort keys are camelCase (`createdAt`, not
  `created_at`); an unknown sort is a 422, an unknown filter a 400.
- **Tokens**: access tokens last 1 day and refresh tokens 7 days (were 1 hour and 7 days from env);
  the refresh token is signed with its own secret and cannot be used as a bearer token.
- **Docs** moved to `/docs` and `/docs/openapi.json` and are off unless `ENABLE_API_DOCS=true`.
