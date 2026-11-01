# Rule: Commits

## Message format

Conventional Commits: `feat`, `fix`, `chore`, `refactor`, `docs`, `remove`, `test`. Summary
lowercase after the colon, imperative, under 72 characters, no trailing period.

```
feat: add refresh token rotation
fix: stop guards from falling through to the handler
```

The full workflow lives in `.claude/commands/commit.md`; it is the authority if the two drift.

## The pre-commit hook

`.husky/pre-commit` runs, on the **whole tree**, in order:

```
bun install
bun run format
bun run lint:fix
bun run i18n:keys
bunx drizzle-kit generate
bunx drizzle-kit migrate
bun run tsc --noEmit
bun run build
```

- **It is not lint-staged.** `format` and `lint:fix` touch unstaged files too.
- **It touches the database and the migration folder.** `drizzle-kit generate` may write a migration
  and `drizzle-kit migrate` runs against `DATABASE_URL`, so a commit needs a reachable database. Check
  `git status` afterwards and stage or discard what it produced deliberately. The hook staying this
  heavy is a settled decision — do not propose removing the migration steps.
- **It regenerates `keys.generated.ts`.** Commit the regenerated file with its catalogue change.

`--no-verify` is allowed only when `format`, `lint`, `typecheck` and `build` already ran clean in this
session. If the hook fails, fix the cause and make a **new** commit — never `--amend` over it.

## Never commit

1. `.env` or any `.env.*` local file.
2. Secrets, keys, tokens, or a real `DATABASE_URL` / SMTP credential.
3. `node_modules/`, `dist/`, the compiled `server` / `worker` binaries, `skills-lock.json`.
4. A migration the hook generated as a side effect of an unrelated change.
5. A hand-edited `src/libs/i18n/locales/keys.generated.ts`.
6. Formatting churn in files the change did not otherwise touch.

## Staging

Stage by explicit path. `git add -A` / `git add .` are forbidden.
