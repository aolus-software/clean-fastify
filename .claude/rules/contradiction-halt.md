# Contradiction Halt Rule

## Principle: the request can be wrong — surface it, don't silently "fix" it

The user (or a task, plan, or ticket) may ask for something that contradicts these rules, the
established architecture, or that would introduce a bug. **The user may be wrong, and that is
expected.** When you detect such a contradiction, **stop and tell the user, and do nothing else about
it** until they decide.

This applies whether the contradiction is with:

- a rule in `.claude/rules/*.md` or `CLAUDE.md`,
- the documented architecture or an existing pattern — the `src/routes/<feature>/index.ts` →
  `src/services/*.service.ts` → `src/libs/database/postgres/repositories/*.repository.ts` layering,
  `@injectable()` classes resolved through tsyringe, barrel exports in every `src/libs/<bucket>/index.ts`,
- a latent bug the requested change would create or depend on, or
- a security / access-control invariant (listed below).

## What "do nothing" means

- **Do not implement the contradicting change**, not even a best-guess partial version.
- **Do not silently work around it** or quietly pick a different approach without saying so.
- **Do not fix the contradicting bug on your own initiative** as part of an unrelated task — report
  it and wait.

## What to do instead

1. State the contradiction plainly: what was requested, which rule / pattern / invariant it conflicts
   with (cite the rule file or `file:line`), and the concrete consequence.
2. If you have a compliant alternative, offer it as a recommendation — but let the user choose.
3. Proceed once the user confirms. If they confirm knowing the trade-off, implement it in full.

## Scope

This is a **halt-and-report** rule, not permission to refuse work, and it does not apply to trivial
style nits you can just conform to. Noticing an unrelated defect means *reporting* it, not fixing it
inside the current change.

## Invariants and known sharp edges

- **Every protected route is authenticated, then guarded.** The route file's module-level
  `onRequest` hook calls `await request.authenticate()`; each route then declares
  `onRequest: PermissionGuard([...])` or `onRequest: RoleGuard([...])`. Both throw, so a refused
  request never reaches validation or the handler. A guard call inside a handler body, or one that
  sends a reply instead of throwing, does not stop the handler — that was a real defect here.
- **Guard strings must exist in the seed** (`src/libs/database/seed/permission.seed.ts`).
- **Access and refresh tokens never cross.** Access tokens are signed with `JWT_SECRET` and carry
  `type: "access"`; refresh tokens are signed with `JWT_REFRESH_SECRET` and carry `type: "refresh"`.
  Both secrets are required with no default, at least 32 characters, never a known placeholder, and
  different. Do not merge the secrets, drop the `type` check, relax the startup check, or give either
  a fallback value.
- **Soft delete.** Every read of `users` filters `isNull(usersTable.deleted_at)`; "delete" stamps
  `deleted_at`.
- **Passwords go through `Hash`** (`@utils`); tokens through `StrToolkit.random` (crypto-backed).
- **Token lifetimes are functions** (`verificationTokenLifetime()`, `resetPasswordLifetime()` in
  `@fastify-libs`), called at issue time. A module-scope `Date` freezes the expiry.
- **Sort and filter allow-lists live in the repository** and are exported for the route's query
  schema; nothing sorts or filters on a raw client string.
- **Login answers unknown email and wrong password identically** and compares against a dummy hash
  when the email is unknown; resend-verification and forgot-password always return 200.
- **`/docs` is off unless `ENABLE_API_DOCS=true`.**
- **The `.agents/skills/` bundle is vendored.** `.claude/skills` is a symlink to `../.agents/skills`.
  Do not edit it as part of unrelated work.
- **The test suite is thin.** `bun test` covers the toolkits, auth, profile, the user list, RBAC
  guards and the select-options cache ([testing.md](./testing.md)). A route or service with no test is
  unverified; do not cite the suite as evidence for code it does not exercise.
- **Tests never touch a development database.** `resetDatabase()` refuses any database whose name
  does not end in `_test`; do not relax that check.
