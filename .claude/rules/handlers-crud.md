# Rule: The canonical CRUD route file

A full CRUD resource is five routes in one `index.ts`, in this order. `src/routes/settings/roles/index.ts`
is the reference — copy its shape.

| Route | Path | Service method | Guard | Success |
| ----- | ---- | -------------- | ----- | ------- |
| list   | `GET ""`        | `findAll(DatatableToolkit.parseFilter(request))` | `<group> list`   | 200 paginated |
| create | `POST ""`       | `create(request.body)`        | `<group> create` | 201, `data: null` |
| detail | `GET "/:id"`    | `findOne(request.params.id)`  | `<group> detail` | 200 |
| update | `PATCH "/:id"`  | `update(id, request.body)`    | `<group> edit`   | 200, `data: null` |
| delete | `DELETE "/:id"` | `delete(request.params.id)`   | `<group> delete` | 200, `data: null` |

Permission strings use the seeded `<group> <action>` vocabulary; the update action is `edit`.

## Response maps

| Route | Statuses in `response` |
| ----- | ---------------------- |
| list   | 200, 400 (unknown filter key/value, bad date), 401, 403, 422 (bad page/perPage/sort/sortDirection), 500 |
| create | 201, 401, 403, 422 (validation, uniqueness, unknown related ids), 500 |
| detail | 200, 401, 403, 404, 422 (non-uuid `:id`), 500 |
| update | 200, 401, 403, 404, 422, 500 |
| delete | 200, 401, 403, 404, 422 (non-uuid `:id`), 500 |

The roles, permissions and users route files share an `ITEM_ERRORS` object
(401/403/404/422/500) for the `:id` routes. Use `NullCreatedResponseSchema` /
`NullSuccessResponseSchema` from `@utils` for `data: null` responses,
`createSuccessPaginationResponseSchema(ItemSchema)` for lists.

## Sub-resource actions

Actions hang off the id after the five CRUD routes (`POST "/:id/reset-password"`). They keep the
parent's permission unless they grant privilege, in which case `RoleGuard(["superuser"])`. Add them to
[routes.md](./routes.md).

## Checklist

- [ ] Five routes, list / create / detail / update / delete, collection paths `""`.
- [ ] Module `authenticate` hook; every route has an `onRequest` guard naming a seeded permission.
- [ ] `PATCH` uses `edit`; create returns 201 in both `ResponseToolkit.success` and the map.
- [ ] `:id` params via a `z.uuid()` params schema; `:id` routes list 404.
- [ ] `tags`, `summary`, `description` naming the permission, `security: [{ BearerAuth: [] }]`.
- [ ] Routes added to [routes.md](./routes.md).
