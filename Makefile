.PHONY: help install dev dev-server dev-worker build start start-server start-worker lint lint-fix format typecheck db-generate db-migrate db-push db-pull db-studio db-drop db-seed db-clickhouse-migrate db-clickhouse-status fresh reset

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Setup:"
	@echo "    install             - Install dependencies"
	@echo ""
	@echo "  Development:"
	@echo "    dev                 - Start server and worker with hot reload"
	@echo "    dev-server          - Start API server only with hot reload"
	@echo "    dev-worker          - Start worker only with hot reload"
	@echo ""
	@echo "  Build:"
	@echo "    build               - Build the application"
	@echo ""
	@echo "  Production:"
	@echo "    start               - Start server and worker"
	@echo "    start-server        - Start API server only"
	@echo "    start-worker        - Start worker only"
	@echo ""
	@echo "  Code Quality:"
	@echo "    lint                - Run ESLint"
	@echo "    lint-fix            - Fix ESLint issues"
	@echo "    format              - Format code with Prettier"
	@echo "    typecheck           - Run TypeScript type checking"
	@echo ""
	@echo "  Database (PostgreSQL/Drizzle):"
	@echo "    db-generate         - Generate migration files"
	@echo "    db-migrate          - Run pending migrations"
	@echo "    db-push             - Push schema to database (dev only)"
	@echo "    db-pull             - Pull schema from database"
	@echo "    db-studio           - Open Drizzle Studio"
	@echo "    db-drop             - Drop all tables (dangerous!)"
	@echo "    db-seed             - Seed database with initial data"
	@echo ""
	@echo "  Database (ClickHouse):"
	@echo "    db-clickhouse-migrate - Run ClickHouse migrations"
	@echo "    db-clickhouse-status  - Check ClickHouse migration status"
	@echo ""
	@echo "  Workflows:"
	@echo "    fresh               - Drop, push schema, and seed (dev only)"
	@echo "    reset               - Generate, migrate, and seed"

install:
	bun install

dev:
	bun run dev

dev-server:
	bun run dev:server

dev-worker:
	bun run dev:worker

build:
	bun run build

start:
	bun run start

start-server:
	bun run start:server

start-worker:
	bun run start:worker

# Code quality
lint:
	bun run lint

lint-fix:
	bun run lint:fix

format:
	bun run format

typecheck:
	bun run typecheck

# Database (PostgreSQL/Drizzle)
db-generate:
	bun run db:generate

db-migrate:
	bun run db:migrate

db-push:
	bun run db:push

db-pull:
	bun run db:pull

db-studio:
	bun run db:studio

db-drop:
	bun run db:drop

db-seed:
	bun run db:seed

# Database (ClickHouse)
db-clickhouse-migrate:
	bun run db:clickhouse:migrate

db-clickhouse-status:
	bun run db:clickhouse:status

# Combined workflows
fresh: db-drop db-push db-seed
	@echo "Database refreshed and seeded!"

reset: db-generate db-migrate db-seed
	@echo "Database migrated and seeded!"