# Copilot instructions — clean-fastify

Bun + Fastify 5 + Zod (`fastify-type-provider-zod`) + Drizzle ORM (PostgreSQL) + Redis + BullMQ +
tsyringe. These examples mirror `CLAUDE.md` and `.claude/rules/`; when they disagree, the rule file
wins.

## Layering

```
src/routes/<feature>/index.ts   HTTP only: schemas, guards, one service call, ResponseToolkit
src/services/*.service.ts       @injectable() classes: checks, transactions, cache, queue dispatch
src/libs/database/postgres/repositories/*.repository.ts   @injectable() classes: SQL only
```

- Runtime and package manager are Bun: `bun run`, `bunx`. Never npm/pnpm/yarn.
- Path aliases: `@config`, `@database`, `@fastify-libs`, `@cache`, `@i18n`, `@types`, `@utils`,
  `@services`, `@routes`, `@bull`. Import from the bucket root.
- Prettier: tabs, double quotes, semicolons, trailing commas. `simple-import-sort` orders imports.
- No `any`, no floating promises, no `console.*` in application code (use `logger` from `@utils`).
- Comments only where the why is non-obvious: one block comment above the block.

## Route file

```ts
import { PermissionGuard } from "@fastify-libs";
import { t } from "@i18n";
import { RoleService } from "@services";
import {
	createSuccessResponseSchema,
	ForbiddenResponseSchema,
	NotFoundResponseSchema,
	ResponseToolkit,
	ServerErrorResponseSchema,
	UnauthorizedResponseSchema,
	ValidationErrorResponseSchema,
} from "@utils";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { RoleDetailSchema, RoleIdParamsSchema } from "./schema";

export default function (fastify: FastifyInstance) {
	const app = fastify.withTypeProvider<ZodTypeProvider>();

	app.addHook("onRequest", async (request) => {
		await request.authenticate();
	});

	// ======================
	// GET: /settings/roles/:id
	// ======================
	app.get(
		"/:id",
		{
			onRequest: PermissionGuard(["role detail"]),
			schema: {
				tags: ["Settings/Roles"],
				summary: "Get role",
				description: "Role detail. Requires 'role detail' permission.",
				security: [{ BearerAuth: [] }],
				params: RoleIdParamsSchema,
				response: {
					200: createSuccessResponseSchema(RoleDetailSchema),
					401: UnauthorizedResponseSchema,
					403: ForbiddenResponseSchema,
					404: NotFoundResponseSchema,
					422: ValidationErrorResponseSchema,
					500: ServerErrorResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const data = await fastify.di
				.resolve(RoleService)
				.findOne(request.params.id);
			return ResponseToolkit.success(
				reply,
				data,
				t("settings.roles.detailFetched"),
			);
		},
	);
}
```

- The module is registered in the `routes` array of `src/app.ts` with its prefix (no autoload); the folder mirrors it. Collection routes use `""`, items `"/:id"`.
- `PATCH`, never `PUT`. Create returns `ResponseToolkit.success(reply, null, message, 201)`; update
  and delete return `null` data with 200.
- Guards are route-level `onRequest` hooks that **throw**: `PermissionGuard([...])` (AND over
  permissions) or `RoleGuard([...])` (AND over roles). `superuser` bypasses both. Privilege-granting
  routes (admin password reset, select-options) use `RoleGuard(["superuser"])`.
- Permission strings are the seeded `<group> <action>` names: `"user list"`, `"role edit"`, ...
- `:id` params are `z.uuid()`, so a malformed id is a 422.
- Never build an error response in a handler: throw from `@fastify-libs` and let `error.plugin.ts`
  map it.

## List route

```ts
// schema.ts — the query schema reuses the repository's own allow-lists
export const RoleQuerySchema = buildDatatableQueryParamsSchema({
	sortFields: roleSortableFields,
	filterFields: roleFilterableFields,
	filterExample: roleFilterExample,
	searchColumns: roleSearchColumns,
});

// index.ts — filters are read off request.url because the Zod schema strips filter[<key>]
const data = await fastify.di
	.resolve(RoleService)
	.findAll(DatatableToolkit.parseFilter(request));
return ResponseToolkit.success(reply, data, t("settings.roles.fetched"));
```

## Service

```ts
@injectable()
export class RoleService {
	constructor(
		private readonly _roleRepository: RoleRepository,
		private readonly _userRepository: UserRepository,
		private readonly _sessionService: SessionService,
	) {}

	async update(
		id: string,
		data: { name: string; permissionIds: string[] },
	): Promise<void> {
		const role = await this._roleRepository.findById(id);
		if (!role) {
			throw new NotFoundError(t("settings.roles.notFound"));
		}

		const existing = await this._roleRepository.findByName(data.name, id);
		if (existing) {
			throw new UnprocessableEntityError(t("auth.validationError"), [
				{
					field: "name",
					message: t("settings.roles.nameExists", { name: data.name }),
				},
			]);
		}

		await db.transaction(async (tx) => {
			await this._roleRepository.update(id, data, tx);
		});
		await this._sessionService.forgetUsers(
			await this._userRepository.findIdsByRole(id),
		);
	}
}
```

- The service owns existence (404) and uniqueness (422) checks and every transaction.
- Any write that changes a user's status, roles, permissions, password or deletion invalidates the
  cached `UserInformation` through `SessionService` (`forgetUsers` / `revokeSessions`).
- Services are resolved with `fastify.di.resolve(Service)` or `container.resolve(Service)`; never
  `new`-ed.

## Repository

```ts
@injectable()
export class RoleRepository {
	private dbInstance = db;

	async findById(
		id: string,
		tx?: DbTransaction,
	): Promise<{ id: string; name: string } | null> {
		const database = tx || this.dbInstance;
		const role = await database.query.roles.findFirst({
			where: eq(rolesTable.id, id),
			columns: { id: true, name: true },
		});
		return role ?? null;
	}
}
```

- Reads return `null` on a miss; no `NotFoundError`, no uniqueness checks, no `t()` in repositories.
- Every method takes `tx?: DbTransaction`; repositories never open a transaction.
- User reads filter `isNull(usersTable.deleted_at)`.
- Response DTOs are camelCase (`createdAt`, `updatedAt`, `isAssigned`); the repository maps snake_case
  columns to them.
- Sort keys are camelCase API names mapped to columns; `DatatableToolkit.parseSort` and
  `assertFilter` throw `BadRequestError` (400) for anything outside the allow-lists.

## Queue

```ts
// producer (inside a service, after the transaction that minted the token commits)
await sendEmailQueue.add("send-email", {
	to,
	subject,
	template,
	lang,
	variables,
});

// worker (src/bull/worker/*.worker.ts) — log and re-throw so BullMQ retries
const worker = new Worker<EmailOptions>(
	"send-email",
	async (job) => {
		try {
			await EmailService.sendEmail(job.data);
		} catch (error) {
			logger.error(error, "Failed to process email job");
			throw error;
		}
	},
	{ connection: RedisClient.getQueueRedisClient() },
);
```

## Config and i18n

- Env is read only in `src/libs/config/env.config.ts` (envalid) and exposed via `AppConfig`,
  `JwtConfig`, `DatabaseConfig`, `RedisConfig`, `MailConfig`, `corsConfig`, `clickhouseConfig`.
- Every user-facing message is a key in both `src/libs/i18n/locales/en.json` and `id.json`; run
  `bun run i18n:keys` after editing them.
