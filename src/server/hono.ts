import { Hono } from "hono";
import { coopRoutes } from "@/server/coop-routes";
import { singlePlayerRoutes } from "@/server/single-player-routes";

const app = new Hono().basePath("/api");

app.get("/health", (c) =>
  c.json({ ok: true, service: "guess-a-card-any-card-api" }),
);

app.route("/coop", coopRoutes);
app.route("/single", singlePlayerRoutes);

export { app };
