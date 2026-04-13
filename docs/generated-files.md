# Generated files & reproducible clones

This monorepo **does not commit** machine-local build output. After `git clone` and `npm ci`, a few generated trees appear locally or in CI.

## Must **not** be committed

| Path / pattern | Produced by | When |
|----------------|-------------|------|
| `node_modules/` | npm | `npm ci` / `npm install` |
| `**/.next/` | Next.js | `next dev`, `next build` |
| `apps/web/next-env.d.ts` | Next.js | first `next dev` / `next build` in `apps/web` |
| `apps/api/src/generated/prisma/` | Prisma | `npm install` (workspace `@gac/api` **postinstall**: `prisma generate`) or `npm run db:generate` |
| `out/`, `dist/`, `.turbo/`, `coverage/`, `*.tsbuildinfo` | Tooling | various commands |

These are listed in **`.gitignore`**. Do not `git add -f` them.

## Must exist **after** install / dev (but stay untracked)

| Path | How it appears |
|------|----------------|
| `apps/api/src/generated/prisma/` | Automatic on **`npm ci`** via `@gac/api` `postinstall` → `prisma generate` (no DB connection required). |
| `apps/web/.next/` | **`npm run dev`** or **`npm run build`** for `@gac/web`. |
| `apps/web/next-env.d.ts` | Created by Next when you run dev/build; referenced from `apps/web/tsconfig.json`. |

If `apps/api` client is missing (e.g. `postinstall` skipped), run from repo root:

```bash
npm run db:generate
```

## **Are** committed (source of truth)

| Area | Role |
|------|------|
| `apps/api/prisma/schema.prisma` | Prisma schema |
| `apps/api/prisma/migrations/` | SQL migrations |
| `packages/shared/src/**` | Shared types; consumed via `transpilePackages` / workspace |

## Vercel uploads

**`.vercelignore`** excludes local artifacts (e.g. `node_modules`, `.next`, generated Prisma client) from the upload bundle. The platform runs `npm ci` and builds from a clean tree; `@gac/api` postinstall regenerates Prisma client if that workspace is installed.

## Workspace layout

Root **`package.json`** declares:

```json
"workspaces": ["apps/*", "packages/*"]
```

- **`@gac/web`** → `apps/web`
- **`@gac/api`** → `apps/api`
- **`@gac/shared`** → `packages/shared` (must remain present; not optional)

A clean clone must keep the **`packages/shared`** directory; removing it breaks `npm ci` for any workspace that depends on `@gac/shared`.
