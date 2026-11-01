# Documentation

Reference guides for `clean-fastify` (Bun + Fastify 5 + Zod + Drizzle + PostgreSQL + Redis + BullMQ).
Start with the root [`README.md`](../README.md) for setup and [`CLAUDE.md`](../CLAUDE.md) for the
architecture summary; the coding rules live in [`.claude/rules/`](../.claude/rules/README.md).

| Guide                                          | What it covers                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Response envelope, auth flow (access and refresh tokens), the full route map with guards, list query parameters, status codes, and the breaking changes in this contract |
| [CONFIGURATION.md](./CONFIGURATION.md)         | Every environment variable read by `src/libs/config/env.config.ts`, with its default and whether it is required                                                          |
| [DEPLOYMENT.md](./DEPLOYMENT.md)               | The multi-stage Dockerfile, the compose stack (app + worker), the `make docker-*` targets, and a production checklist                                                    |
| [ERROR_HANDLING.md](./ERROR_HANDLING.md)       | The error classes, how `error.plugin.ts` maps them and Fastify's own errors to status codes and bodies                                                                   |
| [SECURITY.md](./SECURITY.md)                   | Authentication, token lifecycle, RBAC, enumeration safety, rate limiting, CORS, headers, the docs gate, and session invalidation                                         |
| [PLUGINS.md](./PLUGINS.md)                     | The Fastify architecture: the explicit `app.ts` registration order, the two plugin buckets, and what each plugin does                                                    |

The live OpenAPI reference is served at `/docs` (spec at `/docs/openapi.json`) when
`ENABLE_API_DOCS=true`. It is generated from route schemas and is the authority for request and
response field details.

Vulnerability reporting is covered by [`.github/SECURITY.md`](../.github/SECURITY.md), not by these
guides.
