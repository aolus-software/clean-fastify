# Bun + Fastify, multi-stage. Runs from source (Bun resolves tsconfig paths).
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# ===================================================
# Stage 1: Install dependencies (cached on lockfile)
# ===================================================
FROM base AS install
# --ignore-scripts skips the "prepare" lifecycle (husky): no git hooks inside an image.
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile --ignore-scripts

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

# ===================================================
# Stage 2: Development (hot reload, API + worker)
# ===================================================
FROM base AS development
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=development
EXPOSE 3000/tcp
CMD ["bun", "run", "dev"]

# ===================================================
# Stage 3: Migrator (drizzle-kit needs dev deps)
#   docker build --target migrator -t clean-fastify:migrator .
#   docker run --rm --env-file .env clean-fastify:migrator
# ===================================================
FROM base AS migrator
COPY --from=install /temp/dev/node_modules node_modules
COPY src ./src
COPY tsconfig.json package.json drizzle.config.ts ./
ENV NODE_ENV=production
ENTRYPOINT ["bun", "run", "db:migrate"]

# ===================================================
# Stage 4: Production release (prod deps only)
#   API:    default entrypoint
#   Worker: override the command with src/bull/index.ts (see docker-compose.yml)
# ===================================================
FROM base AS release
ENV NODE_ENV=production
COPY --from=install /temp/prod/node_modules node_modules
COPY src ./src
COPY tsconfig.json package.json ./
# pino writes to storage/logs/ relative to cwd; it must exist and be writable by `bun`.
RUN mkdir -p storage/logs && chown -R bun:bun storage

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run"]
CMD ["src/serve.ts"]
