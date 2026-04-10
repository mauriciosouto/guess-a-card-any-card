# Shared PostgreSQL with `image-guess-admin`

This game app and **image-guess-admin** use **one** PostgreSQL database. Prisma records applied migrations in `_prisma_migrations`.

## Who owns migrations?

| Responsibility | **Game (this repo)** | **Admin (`image-guess-admin`)** |
|----------------|----------------------|--------------------------------|
| `prisma migrate dev` and new folders under `apps/api/prisma/migrations/` | **Yes — source of truth** | **No** against the shared DB |
| `prisma migrate deploy` in staging/production | **Yes** (this app’s CI/deploy) | Default **no**; admin **`prisma generate` only** unless the team explicitly mirrors migration folders |
| `prisma/schema.prisma` for shared tables | **Authoritative** for the full DB | **Mirror** shared models + a **copy** of this repo’s `prisma/migrations/` so the generated client matches production |

### Rules

1. **Never** maintain a **divergent** `prisma/migrations/` tree in admin.
2. **DDL requests** from admin are implemented **here** first (new migration + schema), then merged.
3. After this repo merges a migration, admin **replaces** its `prisma/migrations/` with ours (entire tree, identical files), aligns `Puzzle` and other shared models in `schema.prisma`, then runs `npx prisma generate`.

### Prisma 7 (`prisma.config.ts` + schema)

This game app uses **Prisma ORM 7**. The database URL is **not** set on the `datasource` block in `schema.prisma`; it lives in **`apps/api/prisma.config.ts`** (see [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)). **`image-guess-admin` should mirror the same pattern** so a copied `schema.prisma` matches without edits.

Runtime access uses the **`pg` driver** via `@prisma/adapter-pg` (see `apps/api/src/lib/prisma.ts`). Optional: set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` in `.env` if a managed Postgres pooler surfaces TLS verification errors (e.g. `P1010`).

Prisma schema and migrations for this app live under **`apps/api/prisma/`** (not the repo root).

### Deploy

Apply migrations **before** the app serves traffic in each environment:

```bash
npm run db:deploy
```

(`package.json` — alias for `prisma migrate deploy`.)

Do **not** rely on admin to run `migrate deploy` for shared staging/production unless your team explicitly documents that exception.

### References (admin repo, for humans)

- `docs/SHARED_DATABASE.md`
- `docs/GAME_CLIENT_SPEC.md`
- `docs/PUZZLE_SYSTEM.md`
- `docs/PROMPT_GAME_MIGRATION_FROM_ADMIN.md`

### Verification (optional)

```bash
npx prisma migrate status
```

For drift checks with Prisma 7, use the options described in the [migrate diff docs](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff) (many flags now read connection details from `prisma.config.ts`).

### After a game PR merges (admin checklist)

1. Copy **`prisma/migrations/`** from this repo into admin (full tree).
2. Confirm admin **`Puzzle`** (and other shared models) match this schema and that **`prisma.config.ts`** carries `DATABASE_URL` (schema `datasource` is provider-only).
3. In admin: `npx prisma generate` (not `migrate deploy` on shared DB unless agreed).
