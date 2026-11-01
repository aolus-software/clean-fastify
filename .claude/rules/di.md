# Rule: Dependency injection (tsyringe)

DI is **tsyringe**. The container and decorators are re-exported through `@fastify-libs`
(`container`, `injectable`, `inject`, `singleton`, `scoped`); some files import `injectable` straight
from `tsyringe`, which is the same function. `di.plugin.ts` decorates the app with `fastify.di` (the
same `container`).

## Resolution

| Where | How |
| --- | --- |
| Route handler | `fastify.di.resolve(RoleService)` inside the handler |
| Plugin or hook running per request | `container.resolve(SessionService)` inside the function — `auth.plugin.ts` does this to load `UserInformation` |
| Worker, script | `container.resolve(Service)` |

Resolve inside the function body, never at module top level.

## Registration is automatic

Decorate the class with `@injectable()`; tsyringe reads constructor parameter types through
`emitDecoratorMetadata` (keep it and `experimentalDecorators` on in `tsconfig.json`).

```ts
@injectable()
export class UserService {
	constructor(
		private readonly _userRepository: UserRepository,
		private readonly _authMailService: AuthMailService,
		private readonly _sessionService: SessionService,
	) {}
}
```

- Services and repositories are `@injectable()` classes; constructor parameters are concrete classes.
- `reflect-metadata` is imported once at each entry point: `src/serve.ts`, `src/bull/index.ts`,
  `src/libs/database/seed/index.ts`. A new entry point adds it first.
- Utilities (`Hash`, `StrToolkit`, `DateToolkit`, `ResponseToolkit`, `DatatableToolkit`) are static
  classes imported directly — never `@injectable()`.

## Don't

- Don't `new` a service or repository.
- Don't register with string tokens for application code; `@injectable()` plus class resolution is
  the path. Manual `container.register` is for swapping implementations in tests.
- Don't add a second DI library.
