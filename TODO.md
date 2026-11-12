# Clean Fastify - Improvement TODO List

## 🔴 High Priority

### Script Consistency

- [x] **Fix typo in lint:fix script**
  - Current: `"link:fix"` (typo - should be `lint:fix`)
  - Fix to: `"lint:fix": "bun run eslint . --ext .ts,.js --fix"`

### ESLint Configuration

- [x] **Add import sorting rules**
  - Missing: `eslint-plugin-simple-import-sort` (not installed)
  - Add import ordering rules (like clean-hono and clean-elysia)
  - Add `eslint-plugin-import` for duplicate detection

### Project Structure

- [ ] **Reorganize utilities structure**
  - Current: `libs/utils/toolkit/`, `libs/utils/fastify/`, `libs/utils/security/`
  - Flatten: Move `toolkit/` files (date.ts, number.ts, string.ts) to `utils/` root
  - Update `utils/index.ts` to flat export style (matching clean-hono)

## 🟡 Medium Priority

### OpenAPI Schema Enhancement

- [ ] **Improve OpenAPI schema definitions**
  - Add descriptions and examples to Zod schemas
  - Add `.openapi()` metadata for all request/response schemas
  - Improve error response schemas with validation examples
  - Reference clean-hono's `commonResponse` pattern

### Middleware & Plugins

- [ ] **Add performance monitoring middleware**
  - No performance logging middleware exists
  - Add request duration logging (like clean-hono's `performanceMiddleware`)
  - Warn on slow requests (>1s threshold)

- [ ] **Add body size limit configuration**
  - No explicit body size limit configured
  - Add Fastify body limit via `bodyLimit` option in server configuration

### Service Layer

- [ ] **Add service interfaces**
  - Current: Services are plain objects without interfaces
  - Add TypeScript interfaces for all services (like clean-hono's `service.interface.ts`)
  - Benefits: Better type safety, documentation, and testability

### Module Organization

- [ ] **Standardize module file naming**
  - Current: Routes in `routes/` directory, services in `services/` directory (separated)
  - Consider: Co-locate routes, schemas, services per module (like clean-hono)
  - Each module folder: `routes.ts`, `schema.ts`, `service.interface.ts`, `service.ts`

### Error Handling

- [ ] **Add more error types**
  - Missing: `ServiceUnavailableError` (503), `RateLimitError` (429)
  - Align with clean-hono's comprehensive error class set
  - Add error codes constants (like clean-hono's `error-codes.constant.ts`)

## 🟢 Low Priority

### Documentation

- [ ] **Enhance README.md**
  - Add architecture diagrams
  - Document API authentication flow
  - Add examples for common use cases
  - Document DI pattern with tsyringe
  - Add troubleshooting section

### Testing

- [x] **Add test infrastructure** (issue #16)
  - `bun test` with unit tests for the toolkits and i18n, integration tests through `app.inject`
  - CI `test` job against PostgreSQL and Redis services; total line-coverage gate at the 69% baseline
- [ ] **Raise test coverage**
  - Unit tests for services; integration tests for the remaining auth flows (verify-email,
    reset-password), profile updates, user/role/permission CRUD
  - Raise `MIN_LINE_COVERAGE` in `tests/coverage-gate.ts` as tests land

### Developer Experience

- [x] **Add Makefile** (like clean-hono)
  - Provide convenient shortcuts for common tasks
  - Example: `make dev-all`, `make fresh`, `make reset`

### Environment Files

- [x] **Enhance .env.example**
  - Add more detailed comments for each variable
  - Document which variables are required vs optional
  - Match clean-hono's detailed env structure

### Database

- [x] **Add database seed scripts to package.json**
  - No `db:seed` script in package.json
  - Add: `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:drop`, `db:seed`
  - Add ClickHouse migration scripts

### Logging

- [ ] **Enhance logging configuration**
  - Add log correlation IDs
  - Ensure sensitive data redaction is consistent
  - Add structured logging improvements

### Configuration

- [x] **Consolidate configuration exports**
  - Add a single config index with all configs
  - Ensure consistent naming across config files

## 📊 Comparison Notes (vs clean-hono)

**What clean-hono does better:**

1. ✅ Better organized module structure (co-located files)
2. ✅ Service interfaces for all services
3. ✅ Import sorting in ESLint
4. ✅ Performance monitoring middleware
5. ✅ More comprehensive error types
6. ✅ OpenAPI schema descriptions and examples
7. ✅ Makefile for common tasks
8. ✅ Database seed/migration scripts in package.json

**What clean-fastify does better:**

1. ✅ Full DI with tsyringe (decorator-based, more powerful)
2. ✅ Separate server/worker build targets with concurrently
3. ✅ Auto-loading routes with @fastify/autoload
4. ✅ ClickHouse analytics integration
5. ✅ Comprehensive health check endpoint

## 🎯 Recommended Implementation Order

1. **Phase 1** (Quick wins):
   - Fix lint:fix typo
   - Add import sorting to ESLint
   - Flatten utils structure
   - Add database scripts to package.json

2. **Phase 2** (API improvements):
   - Add OpenAPI descriptions/examples to schemas
   - Add performance monitoring middleware
   - Add missing error types

3. **Phase 3** (Architecture):
   - Add service interfaces
   - Consider module co-location
   - Enhance configuration management

4. **Phase 4** (Quality):
   - Raise test coverage
   - Enhance documentation
   - Add Makefile
