---
description: Stage and commit all current changes following the repo's commit style
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(bun run format:*), Bash(bun run lint:*), Bash(bun run build:*)
---

Commit the current working-tree changes.

Run these in parallel first to gather context:

- `git status` (no `-uall`)
- `git diff` (staged + unstaged)
- `git log --oneline -20` to match the existing commit-message style (prefixes like `chore:`, `refactor:`, `fix:`, `remove:`, `feat:`)

Then:

1. Review the diff and decide the right prefix based on intent (`feat`, `fix`, `chore`, `refactor`, `docs`, `remove`, `test`).
2. Stage files explicitly by path — **never** `git add -A` / `git add .`. Skip `.env`, credentials, generated `dist/`, `node_modules/`, and any other untracked files that look sensitive or build-output.
3. Write a concise 1–2 sentence message focused on **why**, not a file list. Match the lowercased, prefix-style of recent commits.
4. Create the commit with a HEREDOC body (no `--amend`, no `--no-verify`).
5. Run `git status` after to confirm the working tree is clean.

If a pre-commit hook fails, **do not** `--amend` — fix the issue, re-stage, and create a new commit.

Do not push unless I explicitly ask.

## Special rules

If the agent already ran `format`, `lint`, and `build` without any error or warning, the agent is allowed to use `--no-verify`.
