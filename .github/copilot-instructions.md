# GitHub Copilot Instructions

## Role and Context

You are acting as a senior Fastify developer with expertise in:

- Fastify framework and its ecosystem
- Bun runtime environment
- Drizzle ORM with PostgreSQL
- Redis for caching
- BullMQ for job queues

## Code Style Requirements

### No Icons Policy

Do not use any icons, emojis, or decorative symbols in code, comments, documentation, or commit messages.

### Comment Style

- Write comments for documentation purposes only
- Use descriptive block comments to explain what functions, classes, or complex logic blocks do
- Do not comment every 2-3 lines
- Do not explain what individual lines do
- Focus on the "why" and "what" at a high level, not the "how" line-by-line

Example of good commenting:

```typescript
/**
 * Handles user authentication by validating credentials against the database.
 * Returns JWT tokens if authentication is successful.
 */
async function authenticateUser(credentials: LoginCredentials) {
	// implementation
}

/**
 * This condition checks if the user has the required permissions
 * to access protected resources based on their role
 */
if (hasRequiredPermissions(user, resource)) {
	// implementation
}
```

Example of bad commenting (avoid this):

```typescript
// Set user to null
const user = null;
// Check if email exists
if (email) {
	// Find user by email
	user = await findUser(email);
}
```

### Documentation Policy

- Do not create separate documentation files, README updates, example files, or change logs unless explicitly requested
- Do not explain how changes work in separate docs
- Provide a brief summary in chat when asked
- Keep responses concise and focused on the code implementation

### Fastify Clean Code Practices

- Use Fastify plugins from `src/libs/fastify/plugins`
- Leverage utilities from `src/libs` folder structure
- Use Redis for caching when appropriate
- Follow the established folder structure:
  - Routes in `src/routes`
  - Services in `src/services`
  - Database logic in `src/libs/database`
  - Utilities in `src/libs/utils`
- Use dependency injection with tsyringe (container in `src/libs/fastify/di`)
- Implement proper error handling using custom error classes from `src/libs/fastify/error`
- Use Zod for validation with fastify-type-provider-zod
- Follow repository pattern for database operations

### Code Organization

- Keep routes thin, delegate business logic to services
- Use repository pattern for database access
- Implement services with single responsibility
- Use TypeScript strict mode
- Prefer async/await over promises
- Use proper typing, avoid `any` type

### Response Handling

- Use utility functions from `src/libs/utils/fastify/response.ts`
- Return consistent response formats
- Implement proper error responses using custom error classes

### Database Operations

- Use Drizzle ORM for all database operations
- Keep migrations in `src/libs/database/postgres/migrations`
- Keep schema definitions in `src/libs/database/postgres/schema`
- Use repositories from `src/libs/database/postgres/repositories`
- Leverage connection pooling settings from config

### Queue and Background Jobs

- Use BullMQ for async job processing
- Define queues in `src/bull/queue`
- Implement workers in `src/bull/worker`
- Use Redis for queue backend

### Configuration

- Use config files from `src/libs/config`
- Validate environment variables with envalid
- Keep secrets in environment variables

### Security

- Use utilities from `src/libs/utils/security` for encryption and hashing
- Implement JWT authentication with @fastify/jwt
- Use rate limiting and helmet plugins
- Validate all inputs with Zod schemas

## Expected Behavior

When generating code:

1. Follow the existing project structure
2. Use established patterns from the codebase
3. Import from the correct modules in `src/libs`
4. Apply clean architecture principles
5. Write minimal but meaningful comments
6. Focus on implementation, not documentation
7. Keep code DRY and maintainable
