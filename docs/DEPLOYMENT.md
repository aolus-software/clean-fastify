# Deployment

The service runs as **two processes** from the same code: the API (`src/serve.ts`) and the BullMQ
worker (`src/bull/index.ts`), which sends mail. Both need PostgreSQL and Redis; ClickHouse is
optional.

## Dockerfile

`Dockerfile` is multi-stage on `oven/bun:1.3-alpine` and runs from source (Bun resolves the
`tsconfig.json` path aliases, so there is no build step in the image).

| Stage         | Contents                                                                                                                                        | Used by                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `base`        | Bun image, `WORKDIR /app`                                                                                                                       | every stage                               |
| `install`     | dev and production `node_modules`, cached on `bun.lock`, installed with `--ignore-scripts` (no Husky)                                           | the stages below                          |
| `development` | dev deps and the whole tree, `CMD bun run dev` (API + worker, hot reload)                                                                       | local container development               |
| `migrator`    | dev deps, `src/`, `drizzle.config.ts`; entrypoint `bun run db:migrate`                                                                          | `make docker-migrate`, `make docker-seed` |
| `release`     | production deps and `src/` only, runs as the non-root `bun` user, `storage/logs` writable; entrypoint `bun run`, default command `src/serve.ts` | the `app` and `worker` compose services   |

The worker uses the `release` image with the command `src/bull/index.ts`.

## Compose stack

`docker-compose.yml` defines:

| Service      | Image / build                                       | Notes                                                                                 |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `postgres`   | `postgres:18-alpine`                                | database from `POSTGRES_DB` (default `clean_fastify`), port 5432                      |
| `redis`      | `redis:8-alpine`                                    | AOF on, `--requirepass ${REDIS_PASSWORD:-password123}`, port 6379                     |
| `clickhouse` | `clickhouse/clickhouse-server:23.12`                | optional, ports 8123 and 9000                                                         |
| `app`        | build target `release`                              | `env_file: .env`, publishes `${APP_PORT:-3000}`, waits for healthy postgres and redis |
| `worker`     | build target `release`, command `src/bull/index.ts` | `env_file: .env`, waits for healthy redis                                             |

All services share the `app_network` bridge network. Inside it, the app reaches the databases by
service name, so for a compose deployment set in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/clean_fastify
REDIS_HOST=redis
CLICKHOUSE_HOST=http://clickhouse:8123
```

## Make targets

| Target                | Does                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `make docker-build`   | `docker compose build` plus the `migrator` image (`clean-fastify:migrator`) |
| `make docker-up`      | `docker compose up -d --build`                                              |
| `make docker-down`    | `docker compose down`                                                       |
| `make docker-restart` | restart `app` and `worker`                                                  |
| `make docker-logs`    | follow `app` and `worker` logs                                              |
| `make docker-ps`      | stack status                                                                |
| `make docker-migrate` | build the `migrator` image and run `db:migrate` on the compose network      |
| `make docker-seed`    | build the `migrator` image and run `db:seed` on the compose network         |
| `make docker-deploy`  | `git pull`, `docker compose up -d --build`, then `make docker-migrate`      |

`docker-migrate` and `docker-seed` join `$(DOCKER_NETWORK)`, which defaults to
`<lowercased directory name>_app_network`. If you renamed the checkout directory, pass it:
`make docker-migrate DOCKER_NETWORK=myproject_app_network`.

## First deploy

```bash
cp .env.example .env    # set JWT_SECRET, JWT_REFRESH_SECRET, mail, ENABLE_API_DOCS=false, service hostnames
make docker-up
make docker-migrate
make docker-seed        # optional: creates superuser@example.com and admin@example.com
```

Subsequent deploys: `make docker-deploy`.

## Without Docker

```bash
bun install --production
bun run db:migrate
bun run build           # typecheck + dist/serve.js + dist/worker.js
bun run start           # runs both with concurrently
```

Or run `bun run start:server` and `bun run start:worker` under your own process manager. `bun run
build:binary` and `build:binary:worker` produce standalone `./server` and `./worker` executables.

## Production checklist

- `NODE_ENV=production`; `ENABLE_API_DOCS` unset or `false`.
- `JWT_SECRET` and `JWT_REFRESH_SECRET` set to two different random values of at least 32
  characters; the `.env.example` placeholders are rejected at startup.
- `ALLOWED_HOST` set to the real front-end origins.
- `REDIS_PASSWORD` set; Redis and PostgreSQL not reachable from the internet.
- TLS terminated in front of the app. If that proxy forwards client addresses, enable Fastify's
  `trustProxy` for it so the rate limiter sees the client IP.
- Seeded accounts removed or their passwords changed.
- Migrations applied (`make docker-migrate`) before the new image serves traffic.
- `make fresh` and `bun run db:drop` refuse to run with `NODE_ENV=production`; never point them at a
  real database.
- Logs are written by pino to stdout (so `docker compose logs` shows them) and to
  `storage/logs/app.log` inside the container; ship either.
