import { Hono } from "hono";
import { tryResolveUserIdFromRequest } from "@/server/auth/resolve-actor";
import {
  getLeaderboard,
  parseLeaderboardQuery,
} from "@/server/services/leaderboard-service";

export const leaderboardRoutes = new Hono().get("/", async (c) => {
  const parsed = parseLeaderboardQuery({
    metric: c.req.query("metric") ?? undefined,
    mode: c.req.query("mode") ?? undefined,
    limit: c.req.query("limit") ?? undefined,
  });
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }
  const currentUserId = await tryResolveUserIdFromRequest(c.req.raw.headers);
  const body = await getLeaderboard(parsed.value, { currentUserId });
  return c.json(body);
});
