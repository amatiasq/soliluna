# soliluna v3 — one Node process serving the API and the app on the same origin.
#
# Three things shape this file:
#
# - **The API is not compiled.** Node runs the TypeScript directly (type
#   stripping), which is why every relative import in the repo ends in `.ts` and
#   why there is no build step for `packages/api`.
# - **The VPS disk is very small.** The toolchain never reaches the runtime stage:
#   the web bundle is built in `build`, and the runtime node_modules comes from
#   `deps`, a tree that never saw a devDependency. Reusing the build tree with
#   `--prod` does NOT work — pnpm leaves the toolchain behind in
#   `node_modules/.pnpm`, and the image grows by 175 MB of babel and vite.
# - **@soliluna/shared has to stay a symlink.** Node refuses to strip types from a
#   file under node_modules, and pnpm's layout keeps the real path outside it.
#   Flattening the workspace into node_modules breaks the process at boot.
#
# The image is always built for linux/amd64 from a machine that is probably arm64
# — see amq/amq-soliluna-deploy.

# ─── The runtime dependencies, and nothing else ─────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

# pnpm refuses to wipe node_modules without a TTY unless it knows it is a script.
ENV CI=true
# Pinned: the lockfile is pnpm 10's, and an older pnpm ignores
# `onlyBuiltDependencies` in pnpm-workspace.yaml and fails the install.
RUN npm install --global pnpm@10.28.2

# Every package.json, because --frozen-lockfile checks the lockfile against the
# whole workspace, including the parts this stage does not install.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --frozen-lockfile --prod --filter @soliluna/api...


# ─── The web bundle ─────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

ENV CI=true
RUN npm install --global pnpm@10.28.2

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

# Not the root devDependency (Playwright): the E2E suite does not run in here.
RUN pnpm install --frozen-lockfile --filter @soliluna/web...

COPY tsconfig.base.json ./
COPY packages ./packages

RUN pnpm --filter @soliluna/web build


# ─── The image that ships ───────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production
# The database lives on a volume, not in the image.
ENV DB_PATH=/data/soliluna.db
ENV PORT=80
ENV WEB_DIST=/app/packages/web/dist

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Source only, straight from the context: the api and shared directories in the
# other stages carry devDependency symlinks, and none of them belong here.
COPY packages/api/package.json ./packages/api/
COPY packages/api/src ./packages/api/src
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY --from=build /app/packages/web/dist ./packages/web/dist

EXPOSE 80

# serve.ts, never dev.ts: the /api/__test routes that wipe every table are only
# mounted by dev.ts, so they do not exist in this process.
CMD ["node", "packages/api/src/serve.ts"]
