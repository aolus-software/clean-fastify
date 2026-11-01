# Rule: Mail (`src/services/auth-mail.service.ts`, `src/libs/mail/`)

Mail leaves the process through the BullMQ queue. `sendEmailQueue.add("send-email", ...)` returns
immediately; the separate worker process (`src/bull/worker/send-email.worker.ts`) calls
`EmailService.sendEmail`. Calling `EmailService.sendEmail` inline from a request is wrong unless the
mail must land before the response, and then a comment says why.

## `AuthMailService` — mint in the transaction, queue after commit

`AuthMailService` (`@injectable()`, in `src/services/`) owns the auth mails and their tokens:

| Method | Does |
| --- | --- |
| `issueVerificationToken(userId, tx?)` | spends every unused verification token for the user, inserts a new one (`StrToolkit.random(100)`, expiry `verificationTokenLifetime()`), returns it |
| `issueResetToken(userId, tx?)` | same for password reset (`StrToolkit.random(255)`, `resetPasswordLifetime()`) |
| `queueVerificationEmail(user, token)` | enqueues `auth/email-verification` with `${CLIENT_URL}/auth/verify-email?token=...` |
| `queueResetPasswordEmail(user, token)` | enqueues `auth/forgot-password` with `${CLIENT_URL}/auth/reset-password?token=...` |

The caller mints **inside** its `db.transaction(...)` and queues **after** the transaction returns:

```ts
const token = await db.transaction(
	async (tx) => await this._authMailService.issueVerificationToken(user.id, tx),
);
await this._authMailService.queueVerificationEmail(user, token);
```

Queueing inside the transaction would send a link for a token a rollback then deletes. Issuing
**revokes earlier unused tokens** (`used_at` stamped), so only the newest link works.

## Templates

Plain HTML under `src/libs/mail/templates/<area>/<name>.html`. `sendEmail` replaces `{{key}}` from the
flat `variables` record — not Handlebars: no helpers, no loops. Localised variants are
`<name>.<locale>.html` (`email-verification.id.html`); the unsuffixed file is English. Add a
template's `.id.html` in the same change with the same placeholder set.

Producers set `lang: getCurrentLocale()`; subjects come from `mail.subject.*` keys ([i18n.md](./i18n.md)).
`sendEmail` prefixes the subject with `[<APP_ENV>]` outside production — don't prefix it yourself.

## Don't

1. Don't enqueue mail inside a transaction.
2. Don't log a token, a token-bearing URL, or the recipient address — `logger.info({ userId }, "...")`
   in producers, `{ jobId, template, lang }` in the worker and `EmailService`. SMTP errors can quote
   the address, so `EmailService` logs and re-throws only their `code` / `responseCode`.
3. Don't hardcode a host or read `process.env` — links come from `AppConfig.CLIENT_URL`.
4. Don't add a template without its `.id.html` sibling, or pass non-string `variables`.
