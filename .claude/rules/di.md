# Rule: Dependency injection (tsyringe)

DI is provided by **tsyringe**. The container, decorators, and helpers are re-exported through `@fastify-libs`:

```ts
import { inject, injectable, container, scoped, singleton } from "@fastify-libs";
```

The `di.plugin.ts` Fastify plugin decorates the app instance with `fastify.di` (the same `tsyringe` `container`) so handlers can resolve at request time:

```ts
async (request, reply) => {
	const authService = fastify.di.resolve(AuthService);
	// ...
};
```

## When to use it

Inside Fastify route handlers — **always** resolve via `fastify.di.resolve(Service)` instead of constructing services manually. Services own state (cache, DB) and constructor injection only fires when resolved through the container.

Outside a Fastify context (e.g. a BullMQ worker processor), import `container` from `@fastify-libs` and call `container.resolve(Service)` directly.

For repositories and pure utilities (`Hash`, `ResponseToolkit`, `logger`, `StrToolkit`, `DateToolkit`), prefer **direct imports**. Repositories happen to be `@injectable()` because services receive them through constructor injection — that doesn't make them container-resolved everywhere.

## Registration

Registration is **automatic**. Decorate the class with `@injectable()` and tsyringe figures out the rest using `emitDecoratorMetadata` (already enabled in `tsconfig.json`):

```ts
import { injectable } from "@fastify-libs";

@injectable()
export class FooService {
	constructor(
		private _userRepository: UserRepository,
		private _otherService: OtherService,
	) {}
}
```

Rules:

- Every service that participates in DI **must** carry `@injectable()`. Without it, tsyringe can't read constructor metadata and will throw at resolve time.
- Constructor parameters must be **concrete classes** (or have an explicit `@inject("token")` if you genuinely need string tokens — avoid string tokens unless registering a primitive value).
- `reflect-metadata` must be imported **once at process start** (`src/serve.ts` and `src/bull/index.ts` both do this — keep them). If a new entry point appears, add the import at the top.
- Services are imported and re-exported through `src/services/index.ts`. Repositories live under `src/libs/database/postgres/repositories/` and re-export through `@database`.

## Resolution

Inside route handlers (DI plugin runs in `createAppInstance`):

```ts
fastify.post("/login", { schema: { ... } }, async (request, reply) => {
  const authService = fastify.di.resolve(AuthService);
  return authService.login(...);
});
```

Outside Fastify context (BullMQ worker, scripts):

```ts
import { container } from "@fastify-libs";

const fooService = container.resolve(FooService);
```

Tsyringe returns a typed instance — no generic needed when passing the class as the token (unlike a custom container that stores `() => unknown`).

## Don't

- Don't `new FooService(new UserRepository(), ...)` from a route handler. You're bypassing the container and any future singleton/scoped registration won't take effect.
- Don't call `fastify.di.resolve(...)` at module top level. Resolution must happen inside the handler — at module load time, the container may not yet have what you need (and `reflect-metadata` registration is order-sensitive).
- Don't add a second DI library (inversify, awilix, a hand-rolled container). The project standardises on tsyringe; mixing containers fragments the dependency graph.
- Don't register classes via `container.register("token", { useClass: Foo })` for normal application code — `@injectable()` plus direct resolution is the idiomatic path. Manual registration is only for swapping implementations in tests or for primitive-token injection (`container.register("APP_CONFIG", { useValue: ... })`).
- Don't decorate utility helpers (`Hash`, `StrToolkit`, `DateToolkit`, `ResponseToolkit`) with `@injectable()`. They're stateless static-method classes — direct imports are simpler.
- Don't construct repositories manually inside a service (`new UserRepository().findByEmail(...)`). Inject them in the constructor and reuse the instance — that's the only way transaction-aware overrides will work later.
