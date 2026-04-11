import { Hono } from "hono";
import { cors } from "hono/cors";
import { competitiveRoutes } from "@/server/competitive-routes";
import { coopRoutes } from "@/server/coop-routes";
import { singlePlayerRoutes } from "@/server/single-player-routes";

const allowedOrigins =
  process.env.CORS_ORIGIN?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? null;

const app = new Hono().basePath("/api");

app.use(
  "/*",
  cors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : "*",
    allowHeaders: ["Content-Type", "Authorization", "x-guest-id"],
  }),
);

app.get("/health", (c) =>
  c.json({ ok: true, service: "guess-a-card-any-card-api" }),
);

app.route("/coop", coopRoutes);
app.route("/competitive", competitiveRoutes);
app.route("/single", singlePlayerRoutes);

export { app };
