# Rule: Rate limiting

Rate limiting is **global and always on**. `src/libs/fastify/plugins/externals/rate-limiting.plugin.ts`
registers `@fastify/rate-limit` with `global: true`, so every route is counted. There is no per-route
opt-out wired up.

## The configuration

- **100 requests per 1 minute per client** (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW` constants in the
  plugin). Hardcoded: there is no `THROTTLER_*` or rate-limit env var, and no doc or `.env.example`
  entry may imply one.
- **Redis store** (`redis: fastify.redis`, namespace `rate-limit:`), so every API process shares one
  bucket. The plugin declares `dependencies: ["@fastify/redis"]`.
- **Keyed on `request.ip`** — the socket address. Client-supplied headers (`X-Forwarded-For`,
  `X-Real-IP`) are **never** read: rotating them would mint a fresh bucket per request, which is how
  the limiter used to be bypassable. Behind a reverse proxy, enable Fastify's `trustProxy` for that
  proxy so `request.ip` becomes the client address; do not read the header by hand.

## The 429

`errorResponseBuilder` returns `{ statusCode: 429, message: t("errors.tooManyRequests") }`, which the
error plugin renders as:

```json
{ "status": 429, "success": false, "message": "Too Many Requests" }
```

No `data` key. Responses carry the plugin's `x-ratelimit-*` / `retry-after` headers. Any route can
return 429; route schemas do not list it.

## Credential endpoints

`POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`,
`/auth/verify-email`, `/auth/resend-verification` are unauthenticated. Their policy may be
**tightened, never loosened** — tighten with a route-level `config: { rateLimit: { max, timeWindow } }`,
named constants, and a comment saying why.

## Don't

1. Don't key the limiter on any request header.
2. Don't loosen a credential endpoint or raise the global limit for one noisy route.
3. Don't register `@fastify/rate-limit` a second time.
4. Don't claim a rate-limit env var exists.
