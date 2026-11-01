# Skills

Engineering skills available to Claude Code in this repo.

`.claude/skills` is a **symlink** to this directory (`.agents/skills/`), so the same bundle is visible
to any agent that reads either path. Do not replace the symlink with a real directory; the two would
drift.

Skills here are **vendored**: the files in this directory are the source of truth. There is no
provenance lock (`skills-lock.json` is gitignored), so drift against upstream is only detectable by
manual diff. The [`skills`](https://github.com/vercel-labs/skills) CLI can fetch a new skill into the
bundle (`bunx skills add <owner>/<repo>`); what lands here is then maintained by hand.

## Installed skills

### Workflow and process

| Skill | Use it for |
| --- | --- |
| `brainstorming` | Explore intent, requirements and design before implementation |
| `writing-plans` / `executing-plans` | Turn a request into a reviewable plan, then work through it |
| `test-driven-development` | Failing test first, implement to green, refactor (no test runner is configured yet) |
| `systematic-debugging` | Reproduce, isolate, hypothesise, verify |
| `requesting-code-review` / `receiving-code-review` | Ask for and act on a review |
| `verification-before-completion` | Confirm the work actually runs before calling it done |
| `finishing-a-development-branch` | Wrap up and land a branch |
| `using-git-worktrees` | Parallel work trees without disturbing the main checkout |
| `dispatching-parallel-agents` / `subagent-driven-development` | Fan work out to subagents, then integrate |
| `grill-me` / `grill-with-docs` | Stress-test a plan, optionally against the docs |
| `handoff` | Hand a session over with its context |
| `caveman` | Terse output mode |
| `find-skills` / `writing-skills` / `using-superpowers` | Discover, write and use skills |

### Language, framework and database

| Skill | Use it for |
| --- | --- |
| `fastify-best-practices` | Fastify plugins, hooks, schemas, serialization |
| `typescript-pro` / `typescript-advanced-types` | Type-level work in strict TypeScript |
| `clean-code` | Refactoring toward readable code |
| `postgres` / `postgresql-optimization` | PostgreSQL queries, indexes and features |
