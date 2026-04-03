# Guess a Card, Any Card

Next.js game client for **Flesh and Blood**-style veiled-card guessing (single-player, coop, and more). Shares a PostgreSQL database with **`image-guess-admin`**.

## Setup

```bash
npm install            # runs `prisma generate` → outputs client under `src/generated/prisma` (gitignored)
cp .env.example .env   # if present; set DATABASE_URL
npm run db:deploy      # apply Prisma migrations (shared DB)
npm run dev
```

**Prisma 7:** `DATABASE_URL` is read from **`prisma.config.ts`** (CLI) and from the environment at runtime (`pg` adapter in `src/lib/prisma.ts`).

Open [http://localhost:3000](http://localhost:3000).

## Database & migrations

This repository **owns** Prisma migrations for the **shared** database. **`image-guess-admin` must not** run `prisma migrate dev` / author divergent migration history against that database; it mirrors our `prisma/migrations/` after each merge and runs `prisma generate`.

**Deploy:** run migrations as part of release (before the app starts):

```bash
npm run db:deploy
```

Full policy, admin sync checklist, and references: **[docs/database.md](./docs/database.md)**.

## Deploy (staging / pruebas reales)

Vercel + Postgres compartido: migraciones en build, variables de entorno y notas Supabase → **[docs/deploy.md](./docs/deploy.md)**.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run lint` / `npm test` | ESLint, Vitest |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate:dev` | `prisma migrate dev` (local; **game repo only** for shared DB) |
| `npm run db:deploy` | `prisma migrate deploy` — **use in CI/staging/prod** for this app |

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
