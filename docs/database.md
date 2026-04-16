# PostgreSQL for the game app

The game API uses **PostgreSQL** (e.g. Supabase) for rooms, games, guesses, and user stats. **Prisma** records applied migrations in `_prisma_migrations`.

**Card content is not stored as puzzles in the database.** The authoritative printing list comes from **`@flesh-and-blood/cards`**: the API builds a **filtered in-memory catalog at server startup**, derives **available sets** from that catalog, and **picks a random card** when a new game starts. Each `Game` row stores a **snapshot** (`cardId`, `cardName`, `cardSet`, `cardImageUrl`, `revealSeed`, `revealCardKind`, `cardTemplateKey`) so reveal and scoring stay deterministic without joining legacy tables.

An **admin app is not part of this architecture** for now; it does not share this database. Older **`Puzzle` / `PuzzleStep`** tables were removed by migration in favor of the catalog-only model.

## Who owns migrations?

| Responsibility | **This repo (`apps/api/prisma`)** |
|----------------|-----------------------------------|
| New SQL under `prisma/migrations/` | **Yes — source of truth** |
| `prisma migrate deploy` in staging/production | **Yes** (CI/deploy for the game API) |
| `schema.prisma` | **Authoritative** for the game DB |

### Prisma 7 (`prisma.config.ts` + schema)

The database URL is **not** on the `datasource` block in `schema.prisma`; it lives in **`apps/api/prisma.config.ts`** (see [Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)).

Runtime access uses the **`pg` driver** via `@prisma/adapter-pg` (see `apps/api/src/lib/prisma.ts`). Optional: set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` in `.env` if a managed Postgres pooler surfaces TLS verification errors (e.g. `P1010`).

Schema and migrations live under **`apps/api/prisma/`**.

### Deploy

Apply migrations **before** the app serves traffic:

```bash
npm run db:deploy
```

(`package.json` — alias for `prisma migrate deploy` in the API workspace.)

### Catalog vs database

- **Catalog refresh:** reloading **`@flesh-and-blood/cards`** and rebuilding the in-memory catalog happens on **process start** (e.g. **redeploy** or API restart).
- If the catalog **fails to load at boot**, the API should not treat gameplay routes as healthy; there is **no** separate “publish puzzles to DB” step.

### Verification (optional)

```bash
npx prisma migrate status
```

For drift checks with Prisma 7, use the options described in the [migrate diff docs](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff) (many flags read connection details from `prisma.config.ts`).

### Related docs

- `docs/deploy.md` — hosting checklist
- `apps/api/prisma/MIGRATION_STRATEGY.txt` — migration workflow
- `apps/api/prisma/DB_LAYER_OUTLINE.txt` — service/repository map
