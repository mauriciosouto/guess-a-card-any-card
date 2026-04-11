import "./load-env";
import { serve } from "@hono/node-server";
import { app } from "./server/http-app";

const port = Number(process.env.PORT ?? process.env.API_PORT ?? "8787") || 8787;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(
    `[gac-api] http://127.0.0.1:${info.port}/api/health (coop, single player)`,
  );
});
