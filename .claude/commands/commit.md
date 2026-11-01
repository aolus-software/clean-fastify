---
name: commit
description: "Stage and commit the current changes with a Conventional Commit message drawn from the diff, following .claude/rules/commit.md."
risk: medium
source: local
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(bun run format:*), Bash(bun run lint:*), Bash(bun run typecheck:*), Bash(bun run build:*)
---

Commit the current working-tree changes.

Run these in parallel first:

- `git status` (no `-uall`)
- `git diff` (staged + unstaged)
- `git log --oneline -20` to match the existing style (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `remove:`, `test:`)

Then:

1. Pick the prefix from the intent of the diff.
2. Stage files explicitly by path — **never** `git add -A` / `git add .`. Skip `.env*`, credentials,
   `dist/`, `node_modules/`, `skills-lock.json`, compiled `server` / `worker` binaries, and any
   migration the pre-commit hook generated that does not belong to this change.
3. Write a concise message focused on **why**, lowercase after the prefix, under 72 characters.
4. Commit with a HEREDOC body (no `--amend`).
5. Run `git status` afterwards. The hook (`format`, `lint:fix`, `i18n:keys`, `drizzle-kit generate`,
   `drizzle-kit migrate`, `tsc`, `build`) may have rewritten or generated files; report them.

If the hook fails, do **not** `--amend` — fix the cause, re-stage, and create a new commit. The hook
needs a reachable `DATABASE_URL`.

`--no-verify` is allowed only if `format`, `lint`, `typecheck` and `build` already ran clean in this
session.

Do not push unless explicitly asked.
