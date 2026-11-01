# Rule: Route handlers (`src/routes/<feature>/index.ts`)

A route file default-exports `function (fastify: FastifyInstance)`; `src/app.ts` registers it with
its URL prefix. Each route is `app.<verb>(path, options, handler)`: the options carry the
contract (guard, schemas, response map), the handler does the HTTP glue. A handler with no contract is
an undocumented, unvalidated, ungated route.

## File shape

```ts
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
				description: "... Requires 'role detail' permission.",
				security: [{ BearerAuth: [] }],
				params: RoleIdParamsSchema,
				response: { 200: createSuccessResponseSchema(RoleDetailSchema), ...ITEM_ERRORS },
			},
		},
		async (request, reply) => {
			const data = await fastify.di.resolve(RoleService).findOne(request.params.id);
			return ResponseToolkit.success(reply, data, t("settings.roles.detailFetched"));
		},
	);
}
```

- `fastify.withTypeProvider<ZodTypeProvider>()` once at the top, so `request.body/params/query` are
  typed from the schemas. Don't cast `request.body as {...}` when the schema already types it.
- Protected files add the `authenticate` hook once; public files (`auth`, `health`, root) don't.
- Group routes with the `// ===` banner naming the verb and full path. No per-handler JSDoc.

## Responsibility

Read the validated request, call **one** service method resolved with `fastify.di.resolve(Service)`,
return `ResponseToolkit.success(reply, data, t("..."), status?)`. No `db`, no repository, no
conditional on domain state, no try/catch. List routes pass `DatatableToolkit.parseFilter(request)`
to the service — it needs the request so it can read `filter[...]` off `request.url`.

The one handler that touches more than a service is `/auth/login` and `/auth/refresh`, which pass
`fastify.jwt` into `AuthService` because signing needs the registered JWT instance.

## Every route declares its contract

1. **`onRequest: PermissionGuard([...])` or `RoleGuard([...])`** for anything not public or
   self-scoped ([rbac.md](./rbac.md)).
2. **Input schemas** — `body`, `querystring`, `params`, imported from `./schema`
   ([validation.md](./validation.md)).
3. **`response`** — a status-keyed map of envelope schemas listing every status the route can return
   ([errors-and-responses.md](./errors-and-responses.md)).
4. **`tags`, `summary`, `description`, and `security`** on protected routes ([openapi.md](./openapi.md)).

## Don't

- Don't call `reply.status(4xx).send(...)` — throw from the service.
- Don't put a guard check in the handler body; it runs too late and is skipped by copy-paste.
- Don't `new` a service.
