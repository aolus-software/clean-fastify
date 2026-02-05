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

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/your_database"
REDIS_HOST="localhost"
REDIS_PORT=6379
APP_SECRET="your-secret-key"
APP_JWT_SECRET="your-jwt-secret"
```

### Database Setup

```bash
# Generate migration files
make db-generate

# Run migrations
make db-migrate

# Or push schema directly (development only)
make db-push

# Run seeders
make db-seed
```

### Development

Start the development server:

```bash
# Start API server only
make dev-server

# Start worker only
make dev-worker

# Start both server and worker
make dev-all
```

The API will be available at `http://localhost:8001`

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
│   │   ├── plugins/    # Custom plugins
│   │   ├── error/      # Error handlers
│   │   └── di/         # Dependency injection
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
make dev-server      # Start server with hot reload
make dev-worker      # Start worker with hot reload
make dev-all         # Start server and worker concurrently
```

### Production Build

```bash
make build-server    # Build server
make build-worker    # Build worker
make build-all       # Build both server and worker
make start-server    # Start production server
make start-worker    # Start production worker
make start-all       # Start both in production
```

### Code Quality

```bash
make lint           # Run ESLint
make format         # Format code with Prettier
bun run typecheck   # Run TypeScript type checking
```

### Database (PostgreSQL)

```bash
make db-generate    # Generate migration files from schema
make db-migrate     # Run pending migrations
make db-push        # Push schema to database (dev only)
make db-pull        # Pull schema from database
make db-studio      # Open Drizzle Studio UI
make db-drop        # Drop all tables (dangerous!)
make db-seed        # Run database seeders
```

### Database (ClickHouse)

```bash
make migrate-clickhouse        # Run ClickHouse migrations
make migrate-clickhouse-status # Check migration status
```

### Quick Workflows

```bash
make fresh          # Drop, push schema, and seed
make reset          # Generate, migrate, and seed
```

## API Documentation

Once the server is running, visit:

- Swagger UI: `http://localhost:8001/documentation`
- Scalar API Reference: `http://localhost:8001/reference`

## Authentication

The application uses JWT-based authentication:

1. Register: `POST /auth/register`
2. Login: `POST /auth/login`
3. Use returned token in Authorization header: `Bearer <token>`

## Environment Variables

| Variable         | Description                  | Default     |
| ---------------- | ---------------------------- | ----------- |
| `APP_PORT`       | Server port                  | 8001        |
| `APP_HOST`       | Server host                  | localhost   |
| `APP_ENV`        | Environment                  | development |
| `DATABASE_URL`   | PostgreSQL connection string | -           |
| `REDIS_HOST`     | Redis host                   | localhost   |
| `REDIS_PORT`     | Redis port                   | 6379        |
| `APP_JWT_SECRET` | JWT signing secret           | -           |
| `APP_SECRET`     | Application secret key       | -           |

## Testing

Run the test suite:

```bash
bun test
```

## CI/CD

The project includes GitHub Actions workflow for:

- Linting
- Building server and worker
- Running database migrations
- Running seeders

## Contributing

1. Follow the existing code structure
2. Use TypeScript strict mode
3. Write meaningful commit messages
4. Ensure all tests pass before submitting PR

## License

See [LICENSE](LICENSE) file for details.
