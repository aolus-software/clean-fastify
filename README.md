# clean-fastify

A production-ready Fastify application built with clean architecture principles, featuring Bun runtime, Drizzle ORM, Redis caching, and BullMQ job queues.

## Features

- **Fastify Framework** - High-performance web framework
- **Bun Runtime** - Fast JavaScript runtime with built-in bundler
- **Drizzle ORM** - Type-safe SQL ORM with PostgreSQL
- **Redis** - In-memory caching and session storage
- **BullMQ** - Robust queue system for background jobs
- **ClickHouse** - Analytics database support
- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control (RBAC)** - Permission management system
- **TypeScript** - Full type safety
- **Clean Architecture** - Organized, maintainable codebase

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL >= 14
- Redis >= 7
- ClickHouse (optional)

## Getting Started

### Installation

```bash
bun install
```

### Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

`.env.example` is copyable as-is for local development except for the two required secrets: their
placeholder values are rejected at startup, so the API and the worker refuse to boot until you
replace them. Generate each with `openssl rand -base64 48` (at least 32 characters, and the two must
differ):

```env
JWT_SECRET=change-me-before-running
JWT_REFRESH_SECRET=change-me-too-before-running
```

Every variable is described in [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

### Database Setup

```bash
# Start PostgreSQL and Redis (and ClickHouse) locally
docker compose up -d postgres redis

# Apply migrations, then seed
make db-migrate
make db-seed
```

### Development

Start the development server:

```bash
# Start both server and worker
make dev

# Start API server only
make dev-server

# Start worker only
make dev-worker
```

The API will be available at `http://localhost:3000`.

Seeded accounts: `superuser@example.com` and `admin@example.com`, password `S3crEtP4ssw0rd!`.

## Project Structure

```
src/
├── app.ts                 # Fastify app initialization
├── serve.ts              # Server entry point
├── bull/                 # Queue jobs and workers
│   ├── queue/           # Job queue definitions
│   └── worker/          # Job processors
├── libs/                # Shared libraries
│   ├── cache/          # Redis cache utilities
│   ├── config/         # Configuration files
│   ├── database/       # Database setup and migrations
│   │   ├── postgres/   # PostgreSQL with Drizzle
│   │   ├── clickhouse/ # ClickHouse setup
│   │   └── seed/       # Database seeders
│   ├── fastify/        # Fastify plugins and utilities
│   │   ├── default/    # Shared constants (password rule, sort, token lifetimes)
│   │   ├── di/         # Dependency injection (tsyringe)
│   │   ├── error/      # Error classes
│   │   ├── guards/     # PermissionGuard / RoleGuard
│   │   └── plugins/    # externals/ and app/ plugins (registered in app.ts)
│   ├── i18n/           # Translations (en, id)
│   ├── mail/           # Email service
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── routes/             # API route handlers
│   ├── auth/          # Authentication routes
│   ├── profile/       # User profile routes
│   └── settings/      # Settings routes
└── services/          # Business logic layer
```

## Available Commands

### Development

```bash
make dev            # Start server and worker with hot reload
make dev-server     # Start server only with hot reload
make dev-worker     # Start worker only with hot reload
```

### Production Build

```bash
make build          # Typecheck and build dist/serve.js + dist/worker.js
make start          # Start server and worker
make start-server   # Start production server only
make start-worker   # Start production worker only
```

### Code Quality

```bash
make lint           # Run ESLint
make lint-fix       # Fix ESLint issues
make format         # Format code with Prettier
make typecheck      # Run TypeScript type checking
```

### Tests

```bash
make test             # Every test (integration needs TEST_DATABASE_URL and Redis)
make test-watch       # Rerun on change
make test-unit        # tests/unit only, no database
make test-integration # tests/integration only
make test-coverage    # Every test with coverage, 69% total line gate (what CI runs)
```

### Database (PostgreSQL)

```bash
make db-generate    # Generate migration files from schema
make db-migrate     # Run pending migrations
make db-push        # Push schema to database (dev only)
make db-pull        # Pull schema from database
make db-studio      # Open Drizzle Studio UI
make db-drop        # Drop every table and the migration journal (dangerous!)
make db-seed        # Seed permissions, roles and users (idempotent)
```

### Database (ClickHouse)

```bash
make db-clickhouse-migrate        # Run ClickHouse migrations
make db-clickhouse-status         # Check migration status
```

### Quick Workflows

```bash
make fresh          # Drop, migrate, and seed (dev only, destructive)
make reset          # Generate, migrate, and seed
```

### Docker

```bash
make docker-build   # Build compose images (app, worker) and the migrator image
make docker-up      # Start the full stack
make docker-down    # Stop the stack
make docker-restart # Restart app and worker
make docker-logs    # Tail app and worker logs
make docker-ps      # Show stack status
make docker-migrate # Run migrations inside the compose network
make docker-seed    # Seed inside the compose network
make docker-deploy  # git pull + up --build + migrate
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## API Documentation

With `ENABLE_API_DOCS=true` (it defaults to `false`):

- Scalar API reference: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/openapi.json`

The contract (envelope, routes, guards, list query parameters) is in
[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## Authentication

The application uses JWT-based authentication:

1. Register: `POST /auth/register`, then verify the email: `POST /auth/verify-email`
2. Login: `POST /auth/login` returns `{ user, accessToken, refreshToken }`
3. Send `Authorization: Bearer <accessToken>` (valid 1 day)
4. Refresh: `POST /auth/refresh` with `{ refreshToken }` returns a new pair (refresh tokens last 7 days
   and rotate on every use)

Settings routes are guarded by `<group> <action>` permissions (`user list`, `role edit`, ...); the
`superuser` role bypasses every guard.

## Environment Variables

The full list lives in [docs/CONFIGURATION.md](docs/CONFIGURATION.md) and `.env.example`. The ones you
must set:

| Variable             | Description                            | Default     |
| -------------------- | -------------------------------------- | ----------- |
| `JWT_SECRET`         | Signs access tokens                    | required    |
| `JWT_REFRESH_SECRET` | Signs refresh tokens                   | required    |
| `DATABASE_URL`       | PostgreSQL connection string           | placeholder |
| `APP_PORT`           | Server port                            | 3000        |
| `NODE_ENV`           | `development`, `staging`, `production` | development |
| `ENABLE_API_DOCS`    | Serve `/docs`                          | false       |

## Testing

Bun's built-in runner (`bun test`), configured in `bunfig.toml`, which preloads `tests/setup.ts`.
`tests/unit/` needs nothing running; `tests/integration/` drives the app through Fastify's
`app.inject()` against a real PostgreSQL and Redis, without opening a port. The integration helpers
migrate, truncate and re-seed the database, so they refuse any database whose name does not end in
`_test`. Redis uses db `15` (`TEST_REDIS_DB`) and is flushed. Mail jobs are captured in memory, never
queued.

```bash
docker compose up -d postgres redis
docker compose exec postgres createdb -U postgres clean_fastify_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clean_fastify_test make test
```

`make test-coverage` writes `coverage/lcov.info` and fails when total line coverage drops below 69%
(`tests/coverage-gate.ts`), the current baseline. CI runs it with PostgreSQL and Redis services.

### Run, test and debug locally

```bash
make dev-server                                   # API with hot reload on APP_PORT
bun --inspect src/serve.ts                        # API under the debugger (open the printed URL)
bun test tests/integration/auth.test.ts           # one test file
bun test -t "rotates the refresh token"           # tests whose name matches
bun --inspect-brk test tests/unit                 # tests under the debugger, paused on start
LOG_LEVEL=debug DB_LOG_QUERIES=true make dev-server  # verbose logs plus every SQL statement
```

Logs go to stdout and `storage/logs/app.log`. `bun test` pins `LOG_LEVEL=warn`, `NODE_ENV`, throwaway
JWT secrets and the database in `tests/setup.ts`, so `.env` cannot point it at your development data.

## CI/CD

The project includes GitHub Actions workflow for:

- Linting and format check
- Type checking
- Unit and integration tests with a total line-coverage gate, against throwaway PostgreSQL and Redis
- Migration drift check and applying migrations against a throwaway PostgreSQL
- Building server and worker

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

See [LICENSE](LICENSE) file for details.
