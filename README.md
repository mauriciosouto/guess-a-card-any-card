# Guess a Card, Any Card

Next.js game client for **Flesh and Blood**-style veiled-card guessing (single-player, coop, and more). Shares a PostgreSQL database with **`image-guess-admin`**.

## Monorepo

- **`apps/web`** — Next.js UI (típico: **Vercel**).
- **`apps/api`** — Hono + Prisma + REST bajo `/api/*` (típico: **Render** u otro Node).
- **`packages/shared`** — Tipos compartidos (p. ej. snapshot co-op, protocolo WebSocket).

Qué se genera localmente y qué no va a git: **[docs/generated-files.md](./docs/generated-files.md)**.

## Setup local

```bash
npm install
cp .env.example .env    # DATABASE_URL para la API; ver comentarios por app
npm run db:deploy       # migraciones (workspace @gac/api)
```

**Solo front** (sin API, no hay datos):

```bash
npm run dev --workspace=@gac/web
```

**API + front** (recomendado): terminal A `npm run dev:api`, terminal B `npm run dev` (web). En **desarrollo**, Next ya reenvía `/api/*` a `http://127.0.0.1:8787` por defecto; podés sobreescribir con `API_PROXY_TARGET` en `apps/web/.env.local` si la API corre en otro host/puerto.

**Prisma:** esquema y migraciones en **`apps/api/prisma`**. El cliente se genera en `apps/api/src/generated/prisma` (ignorado por git). En `apps/api/prisma.config.ts`, `DATABASE_URL` puede faltar solo para `prisma generate` en entornos sin DB.

## Database & migrations

This repository **owns** Prisma migrations for the **shared** database. **`image-guess-admin` must not** run `prisma migrate dev` / author divergent migration history against that database; it mirrors our `apps/api/prisma/migrations/` after each merge and runs `npx prisma generate`.

**Deploy:** run migrations as part of the API release:

```bash
npm run db:deploy
```

Full policy, admin sync checklist, and references: **[docs/database.md](./docs/database.md)**.

## Deploy (staging / producción)

Front **Vercel**, API **Render** (u otro), variables y proxy: **[docs/deploy.md](./docs/deploy.md)**.

## Scripts (raíz)

| Script | Purpose |
|--------|---------|
| `npm run dev` / `dev:web` | Next en `apps/web` |
| `npm run dev:api` | Hono en `apps/api` (puerto 8787 o `PORT`) |
| `npm run build` / `start` | Build y `next start` del web |
| `npm run start:api` | API en producción (`tsx`) |
| `npm run lint` | ESLint del web |
| `npm test` | Vitest (web + shared) |
| `npm run db:*` | Prisma vía workspace `@gac/api` |
| `npm run realtime:dev` | Servidor WS co-op (workspace API) |

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
