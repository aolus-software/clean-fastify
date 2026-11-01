# Rule: Authorization (RBAC)

Authentication and authorization are two steps, both opt-in per route file. `request.authenticate()`
proves **who** the caller is; a route-level guard decides **what** they may do. A route that has the
first and not the second is open to every logged-in user. Nothing rejects ungated routes for you.

## Authentication

A protected route file adds:

```ts
app.addHook("onRequest", async (request) => {
	await request.authenticate();
});
```

It accepts only an access token (`type: "access"`, signed with `JWT_SECRET`), loads `UserInformation`
(`{ id, name, email, roles: string[], permissions: string[] }`) via `SessionService`, and throws 401
for a bad token or a user who is missing, soft-deleted, or not `active`.

**Refresh tokens are not bearer tokens.** They are signed with `JWT_REFRESH_SECRET`, carry
`type: "refresh"` and a `jti` stored in Redis per user, and are accepted only by `POST /auth/refresh`,
which rotates the pair. Both secrets are required; lifetimes are 1 day (access) and 7 days (refresh).

## The two guards (`src/libs/fastify/guards/`, from `@fastify-libs`)

```ts
onRequest: PermissionGuard(["user list"]),   // every listed permission (AND)
onRequest: RoleGuard(["superuser"]),          // every listed role (AND)
```

- Both are hook factories attached in the route options; route hooks run after the module's
  `authenticate` hook, before validation and the handler.
- Both **throw** `ForbiddenError` (403); a missing `userInformation` throws 401.
- Both **short-circuit for `superuser`**. Don't add a superuser branch of your own.
- AND only. A route that seems to need OR is a sign the catalogue is wrong.

## Permission names come from the seed

`src/libs/database/seed/permission.seed.ts` builds `<group> <action>` over groups `user`, `role`,
`permission` and actions `list`, `create`, `detail`, `edit`, `delete`: **15 permissions, space-separated**
(`"user list"`, not `user:list`). Roles seeded: `superuser` and `admin`, both granted all 15.

A guard naming a string the seed does not produce **fails closed**: only `superuser` gets through and
`admin` gets 403. Grep the seed before writing a guard; extend the seed in the same change if a route
genuinely needs a new permission.

## Privilege-granting routes are role-gated

Routes that can take over an account or escalate privilege use `RoleGuard(["superuser"])`:
`POST /settings/users/:id/reset-password` and both `/settings/select-options/*` routes. Gating admin
password reset on `user edit` would let anyone with that permission take over any account.

## Changes to roles and permissions take effect immediately

Role and permission edits invalidate every holder's cached `UserInformation`; user deletion and
password changes also revoke the refresh token ([services.md](./services.md)).

## Checklist for a protected route

- [ ] The route file has the `authenticate` hook.
- [ ] The route has `onRequest: PermissionGuard([...])` or `RoleGuard([...])`.
- [ ] Every permission string exists in `permission.seed.ts`.
- [ ] Privilege-granting routes use `RoleGuard(["superuser"])`.
- [ ] `401` and `403` are in the `response` map; `security: [{ BearerAuth: [] }]` is set.
- [ ] The description names the requirement; the route is in [routes.md](./routes.md).

## Don't

- Don't rely on the URL prefix for authorization.
- Don't inline `if (!user.permissions.includes(...))` in a handler — use the guards.
- Don't refuse by sending a reply from a hook; throw.
- Don't accept a refresh token where an access token is expected, or vice versa.
