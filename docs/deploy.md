# Publicar el juego (Vercel + Render / Netlify)

El repo es un **monorepo npm**:

| Paquete | Rol | Deploy típico |
|--------|-----|----------------|
| `apps/web` | Next.js (UI) | **Vercel** |
| `apps/api` | Hono + Prisma + Postgres | **Render** (proceso Node largo) o **Netlify Functions** (HTTP serverless) |
| `packages/shared` | Tipos y protocolo WS (co-op) | No se despliega solo |

Artefactos generados (qué ignorar en git / Vercel): **[generated-files.md](./generated-files.md)**.

La API en **Netlify** solo sirve rutas **HTTP** (`/api/*`). El servidor WebSocket de co-op (`realtime:dev`) sigue siendo otro proceso/host (p. ej. Render o un VPS).

## 1. API en Render

1. Nuevo **Web Service**, conectá el mismo repo; **raíz del repo** (no un subdirectorio obligatorio si los comandos usan `workspace`).
2. **Build command:** `npm ci && npm run db:deploy --workspace=@gac/api`
3. **Start command:** `npm run start:api` (equivale a `tsx src/index.ts` en `apps/api`).
4. Variables (mínimo):
   - **`DATABASE_URL`** — Postgres (misma DB que el admin / migraciones en `apps/api/prisma`).
   - Opcional: **`PORT`** — Render inyecta `PORT`; la app usa `process.env.PORT ?? 8787`.
   - **`CORS_ORIGIN`** — Origen del front en producción, p. ej. `https://tu-proyecto.vercel.app` (sin barra final). Si no está definido, CORS usa `*` (útil solo en desarrollo).
   - Co-op push: **`COOP_REALTIME_NOTIFY_URL`**, **`COOP_REALTIME_SECRET`** si usás el proceso `realtime:dev` aparte.

Tras el deploy, probá `GET https://<tu-servicio>.onrender.com/api/health`.

## 1b. API en Netlify

Configuración en `apps/api/netlify.toml` + `apps/api/netlify/functions/gac-api.mts` (Hono con `hono/netlify` y `path: /api/*`).

1. Nuevo sitio en Netlify desde el mismo repo.
2. **Base directory:** `apps/api`.
3. **Build command:** dejá el del `netlify.toml` (`npm run db:deploy` = `prisma migrate deploy`). Requiere **`DATABASE_URL`** también en tiempo de build (migraciones).
4. **Install command:** `cd ../.. && npm ci` (instala el monorepo desde la raíz).
5. **Publish directory:** `apps/api/netlify/public` desde la raíz del repo (o vacío si solo usás `netlify.toml`: ahí ya está definido).
6. Variables (UI de Netlify, scope Build + Functions):
   - **`DATABASE_URL`**
   - **`CORS_ORIGIN`** — dominio del front (p. ej. Vercel), recomendado en producción.
   - Opcional: **`COOP_REALTIME_NOTIFY_URL`**, **`COOP_REALTIME_SECRET`**, **`DATABASE_SSL_REJECT_UNAUTHORIZED`**

Producción: `GET https://<tu-sitio>.netlify.app/api/health`. En Vercel, **`API_PROXY_TARGET`** = `https://<tu-sitio>.netlify.app` (sin `/api`).

## 2. Front en Vercel

1. Importá el repo; **Root Directory** del proyecto: **raíz del monorepo** (donde está el `package.json` con `workspaces`).
2. **Build command:** `npm run build --workspace=@gac/web` (o el default si usás `apps/web/vercel.json` copiado al root — recomendamos dejar la raíz como contexto del monorepo).
3. **Install:** `npm ci` en la raíz (instala workspaces).
4. Variables:
   - **`API_PROXY_TARGET`** — URL base pública de la API **sin** path `/api`, p. ej. `https://gac-api.onrender.com`. Next reescribe `/api/*` del mismo sitio hacia ese host (evita CORS en el navegador).
   - Opcional: **`NEXT_PUBLIC_COOP_WS_URL`** — `wss://.../coop-ws` si tenés el servidor WS en producción.

**Sin** `API_PROXY_TARGET`, las rutas `/api/*` del front no llegan a la API (salvo que vuelvas a correr todo en un solo proceso).

## 3. Desarrollo local

Terminal 1 — API (puerto por defecto 8787):

```bash
cd apps/api && cp ../../.env .env   # o symlink; necesitás DATABASE_URL
npm run dev
```

Terminal 2 — Web con proxy a la API:

En `apps/web/.env.local`:

```env
API_PROXY_TARGET=http://127.0.0.1:8787
```

```bash
npm run dev --workspace=@gac/web
```

Opcional — WebSocket co-op: `npm run realtime:dev` (workspace `@gac/api`).

## 4. Base de datos

- Migraciones viven en **`apps/api/prisma`**. Ejecutá `db:deploy` en el build de Render (o manualmente antes).
- **`DATABASE_SSL_REJECT_UNAUTHORIZED=false`** en la API si Supabase u otro pooler da errores TLS (`P1010`).

## 5. Checklist

- [ ] `DATABASE_URL` en Render (build + runtime).
- [ ] `API_PROXY_TARGET` en Vercel apuntando a la API pública.
- [ ] `CORS_ORIGIN` en la API con el dominio del front (recomendado en producción).
- [ ] Puzzles publicados en admin para probar single/coop.
