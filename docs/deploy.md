# Publicar el juego (Vercel + Render)

El repo es un **monorepo npm**:

| Paquete | Rol | Deploy típico |
|--------|-----|----------------|
| `apps/web` | Next.js (UI) | **Vercel** |
| `apps/api` | Hono + Prisma + Postgres | **Render** (u otro Node con proceso largo) |
| `packages/shared` | Tipos y protocolo WS (co-op) | No se despliega solo |

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
