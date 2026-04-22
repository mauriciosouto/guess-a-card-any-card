import { Hono } from "hono";
import { cors } from "hono/cors";
import { challengeRoutes } from "@/server/challenge-routes";
import { competitiveRoutes } from "@/server/competitive-routes";
import { coopRoutes } from "@/server/coop-routes";
import { leaderboardRoutes } from "@/server/leaderboard-routes";
import { meRoutes } from "@/server/me-routes";
import { profileRoutes } from "@/server/profile-routes";
import { singlePlayerRoutes } from "@/server/single-player-routes";
import { initCardCatalog } from "@/server/services/card-catalog-service";

initCardCatalog();

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

app.route("/me", meRoutes);
app.route("/profile", profileRoutes);
app.route("/leaderboard", leaderboardRoutes);
app.route("/coop", coopRoutes);
app.route("/competitive", competitiveRoutes);
app.route("/challenges", challengeRoutes);
app.route("/single", singlePlayerRoutes);

export { app };
