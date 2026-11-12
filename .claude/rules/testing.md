# Rule: Tests (`tests/`)

Bun's built-in runner (`bun:test`); no other runner or assertion library. `bunfig.toml` preloads
`tests/setup.ts` and writes `text` + `lcov` coverage. `bun run test:coverage` (what CI runs) then runs
`tests/coverage-gate.ts`, which fails when **total** line coverage is below its `MIN_LINE_COVERAGE`
(69%, the current baseline). Bun's own `coverageThreshold` is per file and its "All files" row is an
average of per-file percentages, so neither is used. Raise the gate when tests land; never lower it.

## Layout

```
tests/
├── setup.ts            # preload: reflect-metadata; pins NODE_ENV, LOG_LEVEL, JWT secrets, DATABASE_URL, REDIS_DB
├── coverage-gate.ts    # total line coverage from coverage/lcov.info
├── helpers/
│   ├── app.ts          # mocks the mail queue, builds createAppInstance(), request(method, url, { body, token })
│   ├── database.ts     # resetDatabase(): _test guard, migrate, truncate, seed, flush Redis
│   └── auth.ts         # login(email) -> token pair; signAccessToken(userId)
├── unit/               # no database, no Redis
└── integration/        # through app.inject, real PostgreSQL + Redis
```

## Rules

1. **`tests/setup.ts` is the only test file that writes `process.env`.** `bun test` sets
   `NODE_ENV=test` (which `env.config.ts` rejects) and loads `.env`, so the preload pins every value
   that matters before `@config` is imported. Tests read config through `@config` like the app does.
2. **Unit tests import from aliases** (`@utils`, `@i18n`, `@config`) and open no database or Redis
   connection.
3. **Integration tests go through HTTP** (`request(...)` in `helpers/app.ts`, which wraps
   `app.inject()`), not services, so the authenticate hook, guards, validation and the envelope are
   exercised. The app is built once and never listens; do not call `app.close()` from a test.
4. **Each integration file calls `resetDatabase()` in `beforeAll`.** Files share one process, one app
   and one pg pool; never call `client.end()` from a test.
5. **The database name must end in `_test`.** `resetDatabase` refuses anything else. Point
   `TEST_DATABASE_URL` at a dedicated database; Redis uses `TEST_REDIS_DB` (default 15) and is flushed.
6. **Mail is never queued.** `helpers/app.ts` replaces `@bull/queue/send-email.queue` with an
   in-memory `sendEmailQueue` before importing the app; assert on `queuedMails`. Import the app only
   through that helper.
7. **Seeded users are the fixtures** (`superuser@example.com`, `admin@example.com`, password
   `S3crEtP4ssw0rd!`). A user created through the API is unverified and cannot log in; use
   `signAccessToken(id)` when a test needs one.
8. **The global rate limiter applies** (100 requests per minute, keyed on `request.ip`, which is the
   same for every `inject` call). The Redis flush in `resetDatabase` resets it per file; keep each
   integration file well under 100 requests.
9. A new route or a changed service rule comes with its test in the same change.

## Don't

- Don't run integration tests against a development database, or relax the `_test` guard.
- Don't add a test runner, assertion library or HTTP client (`app.inject` covers it).
- Don't cite the suite as proof for code it does not exercise.
