# Rule: Shared code lives in `src/libs/`

If a piece of code is used by **more than one route module** — or could plausibly be reused — it does **not** live inside `src/routes/`. It lives in `src/libs/<bucket>/`, behind one of the dedicated path aliases.

`src/routes/<feature>/` is for code that is **specific to that one feature**: the route handler file and its Zod schemas. Services (`src/services/`) and repositories (`src/libs/database/postgres/repositories/`) live one layer up because they are reused across routes and across the worker process. The moment a helper, plugin, error class, type, or repository is referenced from a second place, move it under `libs/`.

## The buckets (and what belongs in each)

| Bucket                        | Alias               | Belongs here                                                                                                                                                |
| ----------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/cache/`                 | `@cache`            | Cache wrapper helpers and cache-key builders (`UserInformationCacheKey`, …)                                                                                 |
| `libs/config/`                | `@config`           | Env-derived config objects (`AppConfig`, `DatabaseConfig`, `RedisConfig`, `MailConfig`, `CorsConfig`, `ClickHouseConfig`)                                   |
| `libs/database/`              | `@database`         | `db` instance, Drizzle `schema`, table exports, `DbTransaction`, repository classes, `RedisClient`, ClickHouse client                                       |
| `libs/fastify/default/`       | `@fastify-libs`     | Stable cross-feature constants (`StrongPassword`, `paginationLength`, `defaultSort`, token lifetimes, file-upload limits) — re-exported from `@fastify-libs` |
| `libs/fastify/error/`         | `@fastify-libs`     | Custom HTTP error classes (`HttpError`, `BadRequestError`, `UnprocessableEntityError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `InternalServerError`) |
| `libs/fastify/di/`            | `@fastify-libs`     | tsyringe re-exports: `container`, `injectable`, `inject`, `singleton`, `scoped`                                                                             |
| `libs/fastify/plugins/`       | `@fastify-libs`     | Reusable Fastify plugins (auth, authorization, di, error, superuser; helmet, cors, rate-limit, swagger)                                                     |
| `libs/mail/`                  | `@libs/mail`        | Mail transport, templates, and the `EmailService` class                                                                                                     |
| `libs/types/`                 | `@types`            | Shared TypeScript types (DTOs, query-param types, enums-as-types, queue payload shapes)                                                                     |
| `libs/utils/`                 | `@utils`            | Pure helpers (`Hash`, `Encrypt`, `logger`, `ResponseToolkit`, `DatatableToolkit`, `DateToolkit`, `StrToolkit`, `NumToolkit`, response-schema builders)        |
| `services/`                   | `@services`         | `@injectable()` service classes (`AuthService`, `ProfileService`, …)                                                                                        |
| `routes/`                     | `@routes`           | Top-level route definitions (rarely imported — autoload handles wiring)                                                                                     |
| `bull/`                       | `@bull`             | BullMQ queues, workers, and the worker entry                                                                                                                |

Everything in `libs/fastify/` is re-exported through the single `@fastify-libs` barrel — don't deep-import from `@fastify-libs/error/...` when `@fastify-libs` already re-exports the symbol.

## Hard rules

1. **No relative imports across feature folders.** A file in `src/routes/auth/` may not `import "../../routes/profile/..."`. If two routes need the same thing, lift it (to `@services`, `@database`, `@utils`, or `@fastify-libs`).
2. **No module-internal helpers leaking out.** Files in `src/routes/<feature>/` may only be imported by sibling files in the same folder. The exception is the default-exported route function — `@fastify/autoload` consumes that automatically.
3. **Always import through aliases**, never via relative path: `import { UserRepository } from "@database"`, not `import { UserRepository } from "../../libs/database/postgres/repositories/user.repository"`. Aliases are defined in `tsconfig.json` `paths`.
4. **Every `libs/<bucket>/` folder has an `index.ts` barrel** that re-exports its public surface. New files **must** be added to the barrel — otherwise the alias won't resolve them and consumers will fall back to deep imports.

## Decision flow when adding a new file

1. Will exactly **one** route use it, ever? → put it in that route's folder (`src/routes/<name>/`).
2. Is it business logic that may be reused across routes, or invoked from a worker / cron / script? → it's a service. `src/services/<feature>.service.ts`, `@injectable()`, re-export from `src/services/index.ts`.
3. Is it data access? → repository under `src/libs/database/postgres/repositories/`, re-exported from `@database`.
4. Is it a cross-cutting concern (auth, logging, errors, cache, mail, response shaping, validation primitives)? → put it in the appropriate `libs/<bucket>/` and re-export from that bucket's `index.ts`.
5. Doesn't fit any existing bucket but is genuinely shared? → think twice before adding a new bucket. A new bucket means a new `tsconfig.json` path entry, a new barrel, and a new mental category. Prefer fitting it into `@utils` or `@fastify-libs/default` unless it's a clear new infrastructure client.

## Within `@utils`

`@utils` is the catch-all for **pure** helpers. Anything stateful or I/O-bound belongs elsewhere:

- Cache → `@cache`
- Database / Redis client → `@database`
- Plugin / middleware → `@fastify-libs/plugins`
- Mail → `@libs/mail`

Current sub-structure (all re-exported from `src/libs/utils/index.ts` — import via `@utils`, never deep):

```
libs/utils/
├── date.ts                       # DateToolkit (dayjs wrappers)
├── number.ts                     # NumToolkit
├── string.ts                     # StrToolkit
├── security/
│   ├── hash.ts                   # Hash (bcrypt wrapper)
│   └── encrypt.ts                # Encrypt/Decrypt (crypto-js wrapper)
└── fastify/
    ├── datatable.ts              # DatatableToolkit
    ├── logger.ts                 # pino `logger` + createLoggerConfig
    ├── response.ts               # ResponseToolkit, ResponseToolkitV2
    └── response-schema.ts        # createSuccessResponseSchema, *Pagination*, error schemas
```

When adding a new util, find the closest existing file (`date.ts`, `string.ts`, …) before creating a new one. If you create a new file, add it to `libs/utils/index.ts`.

## Examples — where to put it

- A regex for validating Indonesian phone numbers, used by user + profile schemas → `libs/fastify/default/phone.ts`, re-exported from `@fastify-libs`.
- A function that turns a UUID into a short slug, used in 3 routes → extend `libs/utils/string.ts` (or new file, then add to `utils/index.ts`).
- A Fastify plugin that adds an `X-Request-ID` header → `libs/fastify/plugins/app/request-id.plugin.ts` (autoload picks it up).
- A "users with active subscription" SQL helper → extend `user.repository.ts` (don't create a new repo per query).
- An `EmailWelcomePayload` type used by the worker + auth service → `libs/types/...`, re-exported from `@types`.
- A constant for "max allowed login attempts" used by the auth plugin and the auth service → `libs/fastify/default/login-attempts.ts`.

## Don't

- Don't `import` from another route via relative path. If you're typing `../../routes/...`, stop — the thing belongs in a `libs/` bucket or in a service.
- Don't duplicate a helper across routes "for now". Lift it on the first reuse, not the third.
- Don't import directly from a bucket's nested file (`@utils/fastify/response`) when the barrel re-exports it — always import from the bucket root (`@utils`). The only time deep imports are acceptable is when the barrel intentionally omits the symbol.
- Don't add a new top-level `src/` folder for shared code. The choices are `src/libs/<bucket>/`, `src/services/`, `src/bull/`, or `src/routes/<feature>/` — that's it.
