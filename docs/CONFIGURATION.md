# Configuration

Every environment variable is validated once, at startup, by envalid in
`src/libs/config/env.config.ts`. Nothing else reads `process.env`; the rest of the code reads the
derived config objects exported from `@config` (`AppConfig`, `JwtConfig`, `DatabaseConfig`,
`RedisConfig`, `MailConfig`, `corsConfig`, `clickhouseConfig`). A missing required variable or an
invalid value stops the process with an envalid report.

Bun loads `.env` automatically. Start from `.env.example`:

```bash
cp .env.example .env
```

## Rules for `.env`

- Keep values **unquoted**: `docker run --env-file` passes quotes literally.
- Don't write `VAR=` for a variable whose validator rejects an empty string (`host`, `url`, `port`,
  required `str`). envalid treats `VAR=` as provided-but-empty, which defeats the default and fails
  validation. Delete the line instead. `ALLOWED_HOST=` and `REDIS_PASSWORD=` are the only variables
  where an empty value is meaningful.
- Never commit `.env`.

## Reference

### Application

| Variable          | Validator                                  | Default                 | Required | Purpose                                                                                                                                |
| ----------------- | ------------------------------------------ | ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`        | `development` \| `staging` \| `production` | `development`           | no       | Exposed as `AppConfig.APP_ENV`. Outside `production`, mail subjects are prefixed `[<ENV>]` and `make fresh` is allowed                 |
| `APP_NAME`        | str                                        | `Fastify App`           | no       | Shown by `GET /` and the OpenAPI title                                                                                                 |
| `APP_PORT`        | port                                       | `3000`                  | no       | Listen port; the server binds `0.0.0.0`                                                                                                |
| `APP_URL`         | url                                        | `http://localhost:3000` | no       | Public base URL of the API                                                                                                             |
| `APP_TIMEZONE`    | str                                        | `UTC`                   | no       | Timezone for `DateToolkit`, the date filters and log timestamps                                                                        |
| `APP_KEY`         | str                                        | `your-app-key`          | no       | Key for `EncryptionToolkit` (AES). Set a real value if you use it                                                                      |
| `LOG_LEVEL`       | `info` \| `warn` \| `debug`                | `info`                  | no       | Level of the API server logger (`app.ts`), which writes to stdout and `storage/logs/app.log`                                           |
| `ENABLE_API_DOCS` | bool                                       | `false`                 | no       | Serves `/docs` and `/docs/openapi.json`. The only docs switch, independent of `NODE_ENV`. `true` in `.env.example` for local work only |
| `CLIENT_URL`      | url                                        | `http://localhost:3000` | no       | Front-end base URL for mail links (`/auth/verify-email?token=`, `/auth/reset-password?token=`)                                         |

### JWT

| Variable             | Validator | Default | Required | Purpose                                    |
| -------------------- | --------- | ------- | -------- | ------------------------------------------ |
| `JWT_SECRET`         | str       | none    | **yes**  | Signs and verifies access tokens (1 day)   |
| `JWT_REFRESH_SECRET` | str       | none    | **yes**  | Signs and verifies refresh tokens (7 days) |

Use two different random values (`openssl rand -base64 48`). Startup fails when either secret is
shorter than 32 characters, is one of the known placeholders (including the two shipped in
`.env.example`), or when both are the same value. `.env.example` keeps its placeholders on purpose,
so a copied file cannot boot with a secret that is published in this repository. The lifetimes are
fixed in `src/libs/config/jwt.config.ts`; there is no expiry variable.

### Database (PostgreSQL)

| Variable                | Validator | Default                                        | Purpose                                                                                                    |
| ----------------------- | --------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | str       | `postgres://user:password@localhost:5432/mydb` | Connection string for the app, `drizzle-kit`, the seeders and `db:drop`                                    |
| `DB_POOL_MIN`           | num       | `2`                                            | `pg` pool minimum                                                                                          |
| `DB_POOL_MAX`           | num       | `10`                                           | `pg` pool maximum                                                                                          |
| `DB_IDLE_TIMEOUT`       | num       | `30000`                                        | Idle client timeout, ms                                                                                    |
| `DB_CONNECTION_TIMEOUT` | num       | `5000`                                         | Connection timeout, ms                                                                                     |
| `DB_LOG_QUERIES`        | bool      | `false`                                        | Logs each statement at `debug` (text and parameter count, never values); shows only with `LOG_LEVEL=debug` |

The pool is per process: the API and the worker each open up to `DB_POOL_MAX` connections.

`.env.example` also carries `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` and
`POSTGRES_SLOW_QUERY_MS`. The app does not read them; `docker-compose.yml` uses them to provision the
`postgres` container, so keep the first three in sync with `DATABASE_URL` (default database
`clean_fastify`). `POSTGRES_SLOW_QUERY_MS` (default `100`) sets `log_min_duration_statement`: every
statement slower than that many milliseconds goes to the container log; `-1` disables it.

### Redis

| Variable         | Validator | Default     | Purpose                                                                                     |
| ---------------- | --------- | ----------- | ------------------------------------------------------------------------------------------- |
| `REDIS_HOST`     | host      | `localhost` | Cache, refresh-token ids, rate limiter, BullMQ                                              |
| `REDIS_PORT`     | port      | `6379`      |                                                                                             |
| `REDIS_PASSWORD` | str       | `""`        | Empty means no auth. `docker-compose.yml` starts Redis with `password123` unless overridden |
| `REDIS_DB`       | num       | `0`         | Database index                                                                              |

### Mail (SMTP)

| Variable      | Validator         | Default                            | Purpose                                     |
| ------------- | ----------------- | ---------------------------------- | ------------------------------------------- |
| `MAIL_HOST`   | host              | `smtp.example.com`                 | SMTP host                                   |
| `MAIL_PORT`   | port              | `587`                              | SMTP port                                   |
| `MAIL_SECURE` | `true` \| `false` | `false`                            | TLS from connect (use `true` with port 465) |
| `MAIL_FROM`   | str               | `Fastify <your_email@example.com>` | From header                                 |
| `MAIL_USER`   | str               | `your_email@example.com`           | SMTP user                                   |
| `MAIL_PASS`   | str               | `your_email_password`              | SMTP password                               |

Only the worker process sends mail; the API enqueues jobs.

### CORS

| Variable       | Validator | Default | Purpose                                                                                                          |
| -------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `ALLOWED_HOST` | str       | `""`    | Comma-separated allowed origins (`https://app.example.com,https://admin.example.com`). Empty allows every origin |

Methods are fixed to `GET, POST, PATCH, DELETE`; allowed headers to `Content-Type`, `Authorization`,
`Accept-Language`; credentials off; preflight cache 86400 s (`src/libs/config/cors.config.ts`).

### ClickHouse (optional)

| Variable              | Validator | Default                 | Purpose            |
| --------------------- | --------- | ----------------------- | ------------------ |
| `CLICKHOUSE_HOST`     | url       | `http://localhost:8123` | Analytics database |
| `CLICKHOUSE_USER`     | str       | `default`               |                    |
| `CLICKHOUSE_PASSWORD` | str       | `""`                    |                    |
| `CLICKHOUSE_DATABASE` | str       | `default`               |                    |

The API does not need ClickHouse to boot or to pass `/health`.

## Tests

Read only by `tests/setup.ts` under `bun test`, never by the app. The preload also pins
`NODE_ENV=development`, `LOG_LEVEL=warn`, `ENABLE_API_DOCS=false`, `DB_LOG_QUERIES=false` and throwaway
JWT secrets, so a `.env` that `bun test` loads cannot point the suite at development data.

| Variable            | Default                                                            | Purpose                                                                  |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `TEST_DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/clean_fastify_test` | Replaces `DATABASE_URL`; the name must end in `_test` or the suite stops |
| `TEST_REDIS_DB`     | `15`                                                               | Replaces `REDIS_DB`; flushed before each integration file                |

## Not configurable

- Rate limit: 100 requests per minute per client IP, in `rate-limiting.plugin.ts`. There is no
  rate-limit variable.
- User-information cache TTL: 3600 s (`src/libs/cache/const.ts`).
- Verification and reset token lifetimes: 1 hour (`src/libs/fastify/default/token-lifetime.ts`).
- Request body limit: 100 KB (`bodyLimit` in `src/app.ts`); larger bodies get 413.
