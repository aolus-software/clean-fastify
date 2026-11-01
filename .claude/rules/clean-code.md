# Rule: Clean code

Formatting and most type discipline are machine-enforced. This rule covers what the machine checks,
and the conventions it cannot check.

## The commands

| Task | Script | Make target |
| --- | --- | --- |
| Lint | `bun run lint` | `make lint` |
| Lint and fix | `bun run lint:fix` | `make lint-fix` |
| Format | `bun run format` | `make format` |
| Check formatting only | `bun run format:check` | *(none)* |
| Type check | `bun run typecheck` | `make typecheck` |
| Build (typecheck + bundle) | `bun run build` | `make build` |

`.agents/` and `.claude/` are excluded from ESLint and Prettier.

## Formatting (Prettier, `.prettierrc`)

Tabs, width 2. Double quotes. Semicolons. Trailing commas everywhere. Print width 80. LF endings.
Don't hand-align, don't reformat a file you didn't otherwise touch. Imports are ordered by
`simple-import-sort` at **error** level — never hand-order them.

## Types

- `@typescript-eslint/no-explicit-any` is an **error**. Use `unknown` and narrow.
- `strict` plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` (`tsconfig.json`).
  Prefix a deliberately unused parameter with `_`.
- **Explicit return types on every exported function and every service/repository method.** ESLint
  does not enforce this; review does.
- `experimentalDecorators` and `emitDecoratorMetadata` must stay on — tsyringe needs them.

## Promises

`@typescript-eslint/no-floating-promises` is an **error**. Every promise is awaited, returned, or
explicitly caught. Background work goes through BullMQ ([queue.md](./queue.md)).

## Logging

`no-console` is a warning; treat `console.*` as forbidden in application code. The accepted uses
carry `// eslint-disable-next-line no-console` and sit in entry points and standalone scripts:
`src/serve.ts`, `src/bull/index.ts`, `src/libs/database/seed/index.ts`,
`src/libs/database/postgres/scripts/drop.ts`, the ClickHouse and i18n scripts.

Elsewhere use `logger` from `@utils` (pino), object first, fixed message second:

```ts
logger.info({ userId: user.id }, "Verification email queued");
```

Never log a password, a hash, a token, a token-bearing URL, or a mail recipient's address. The
logger (`createLogger`) writes to stdout and `storage/logs/app.log`.

## Comments

One block comment above a function, class, or genuinely non-obvious block explaining **what and
why**. No line-by-line narration. Delete commented-out code rather than shipping it.

## Don't

1. No emoji or decorative symbols in code, comments, logs, catalogs, templates, or generated files.
2. No `console.*` in application code.
3. No `any`.
4. No unawaited promise.
5. No `process.env` outside `src/libs/config/` ([fastify.md](./fastify.md)).
6. No new README, CHANGELOG, or docs file unless asked; keeping an existing doc true is
   [documentation.md](./documentation.md).
