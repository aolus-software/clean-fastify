# Rule: Services (`src/services/`)

Services hold the business rules. Repositories hold data access. Route handlers are the glue. A
service is the only layer allowed to open a transaction.

## Shape — `@injectable()` class

```ts
@injectable()
export class RoleService {
	constructor(
		private readonly _roleRepository: RoleRepository,
		private readonly _sessionService: SessionService,
	) {}

	async findAll(queryParam: DatatableType): Promise<PaginationResponse<RoleList>> {
		return await this._roleRepository.findAll(queryParam);
	}
}
```

- Dependencies are constructor parameters (concrete classes), resolved by tsyringe ([di.md](./di.md)).
  Never `new` a repository or service.
- Every method has explicit parameter and return types.
- Export from `src/services/index.ts` (settings services via `src/services/settings/index.ts`) so
  routes import from `@services`. A service imports a sibling service with a relative import
  (`../session.service`), never through `@services`, to avoid a barrel cycle.

## No HTTP inside a service

Services take primitives and DTOs and return DTOs. No `request`, no `reply`. The one Fastify object a
service receives is the `JWT` instance passed into `AuthService.issueTokens` / `refresh`.

## Transactions

Repositories accept `tx?`; services open the transaction and thread `tx` through every call that must
commit together (`users` + `user_roles`, `roles` + `role_permissions`, a user write + its token). Side
effects that must not happen on rollback — queueing mail, dropping cache — run **after** the
transaction returns ([mail.md](./mail.md)).

## Errors

Throw; never return an error object.

| Situation | Error |
| --- | --- |
| Row missing | `NotFoundError` (404) |
| Uniqueness conflict, unknown related ids, business rule after validation | `UnprocessableEntityError` (422) with `[{ field, message }]` |
| Login failure, invalid/expired/used token | `BadRequestError` (400) with `[{ field, message }]` |
| Authentication state lost | `UnauthorizedError` (401) |
| Caller not permitted | leave it to the route guard — never throw `ForbiddenError` from a service |

Messages are `t("...")` keys ([i18n.md](./i18n.md)).

## Cache invalidation goes through `SessionService`

The auth plugin authorizes from a cached `UserInformation` (`user:<id>`, 1 hour). Any write that
changes what it contains must invalidate it, or the caller keeps old roles for up to an hour:

| Write | Call |
| --- | --- |
| user update, profile update | `forgetUsers([id])` |
| user delete, admin password reset, password reset, own password change | `revokeSessions(id)` (also kills the refresh token) |
| role update / delete | `forgetUsers(await this._userRepository.findIdsByRole(id))` |
| permission update / delete | `forgetUsers(await this._userRepository.findIdsByPermission(id))` |

Never build a cache key inline; never write `Cache` for user state outside `SessionService`.

Every role or permission create, update or delete also calls `this._selectOptionService.forget()`
after the write: `SelectOptionService` caches both select-option lists for 3600 s. A direct database
write (the seeder, `make fresh`) does not, so those lists can lag by up to an hour until Redis is
flushed.

## Enumeration-leaky paths stay silent

`resendVerification` and `forgotPassword` return early for an unknown (or already verified) email.
`login` checks the password first, against a dummy hash for an unknown email, and answers unknown
email and wrong password with the same message.

## Logging

`logger` from `@utils`, object first: `logger.info({ userId }, "Password reset")`. Never a token,
password, or hash.

## Don't

- Don't put query logic in a service, or business rules in a repository.
- Don't catch an error only to re-throw it unchanged.
- Don't enqueue mail or touch the cache inside a transaction.
