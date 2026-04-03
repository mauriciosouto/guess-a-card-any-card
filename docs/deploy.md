# Publicar el juego (pruebas reales)

La app es **Next.js 16** y la API corre con **Hono** en rutas bajo `/api/*` (`src/app/api/[[...route]]/route.ts`). El despliegue más directo es **Vercel** (mismo stack que `hono/vercel`).

## 1. Base de datos

Necesitás el **mismo Postgres** que usa el admin (o una copia con migraciones aplicadas).

- En Vercel → **Settings → Environment Variables**, definí al menos:
  - **`DATABASE_URL`** — URI de Postgres (ver abajo si usás Supabase).
- Opcional: **`DATABASE_SSL_REJECT_UNAUTHORIZED=false`** si aparecen errores TLS al conectar (p. ej. `P1010`).

**Supabase:** si `prisma migrate deploy` falla al compilar en Vercel con el string del **pooler** (puerto 6543), probá con la **conexión directa** (host `db.*.supabase.co`, puerto `5432`) en `DATABASE_URL` para el proyecto de Vercel; el runtime serverless suele funcionar bien con pooler, pero las migraciones a veces piden la URL directa. Ajustá según la guía actual de Prisma + Supabase.

## 2. Vercel

1. Importá el repo en [vercel.com](https://vercel.com).
2. **Node:** 20.x (recomendado; está declarado en `package.json` → `engines`).
3. **Build:** `vercel.json` ejecuta `prisma migrate deploy && next build` para aplicar migraciones antes de generar la app (requiere `DATABASE_URL` disponible en el **build**, no solo en runtime).
4. Tras el deploy, abrí la URL del proyecto y probá **Home → Single player** y `GET /api/single/sets` (debería responder JSON).

## 3. Sin Vercel (Docker / VPS)

```bash
export DATABASE_URL="postgresql://..."
npm ci
npm run db:deploy
npm run build
npm start
```

Serví el puerto que exponga tu plataforma (p. ej. `3000`). Asegurate de variables de entorno en el proceso o en el orquestador.

## 4. Checklist rápido

- [ ] `DATABASE_URL` en el entorno de build y de runtime.
- [ ] Migraciones aplicadas (`migrate deploy` ok en el log de build o manualmente antes).
- [ ] En admin: puzzles publicados (`savedAt`, `isActive`, `dataSource = fab`) para que `/api/single/sets` y partidas single tengan datos.

## 5. Auth / dominios (después)

OAuth, dominio custom y entornos **Preview** con otra base son mejoras posteriores; para pruebas reales iniciales alcanza con un proyecto Vercel + la misma DB de staging.
