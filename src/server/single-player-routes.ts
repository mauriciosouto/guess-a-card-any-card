import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  findCardNameSuggestions,
  getAvailableSets,
} from "@/server/services/puzzle-service";
import {
  parsePlayerIdentityFromHeaders,
  SinglePlayerHttpError,
  startSinglePlayerGame,
  getSinglePlayerGamePublic,
  submitSinglePlayerGuess,
} from "@/server/services/single-player-service";

function handleErr(c: Context, e: unknown) {
  if (e instanceof SinglePlayerHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const singlePlayerRoutes = new Hono()
  .get("/sets", async (c) => {
    try {
      const sets = await getAvailableSets();
      return c.json({ sets });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/cards/search", async (c) => {
    try {
      const q = c.req.query("q")?.trim() ?? "";
      if (q.length < 3) {
        return c.json({ names: [] as string[] });
      }
      const names = await findCardNameSuggestions({ query: q, limit: 20 });
      return c.json({ names });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/games", async (c) => {
    try {
      const identity = parsePlayerIdentityFromHeaders(c.req.raw.headers);
      const body = (await c.req.json().catch(() => ({}))) as {
        selectedFabSets?: string[];
      };
      const raw = Array.isArray(body.selectedFabSets) ? body.selectedFabSets : [];
      const selectedFabSets = raw
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const out = await startSinglePlayerGame({
        selectedFabSets,
        identity,
      });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/games/:gameId", async (c) => {
    try {
      const identity = parsePlayerIdentityFromHeaders(c.req.raw.headers);
      const gameId = c.req.param("gameId");
      const snap = await getSinglePlayerGamePublic({ gameId, identity });
      return c.json(snap);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/games/:gameId/guess", async (c) => {
    try {
      const identity = parsePlayerIdentityFromHeaders(c.req.raw.headers);
      const gameId = c.req.param("gameId");
      const body = (await c.req.json().catch(() => ({}))) as {
        guessText?: string;
        timeTakenMs?: number;
      };
      const guessText = typeof body.guessText === "string" ? body.guessText : "";
      const timeTakenMs =
        typeof body.timeTakenMs === "number" && Number.isFinite(body.timeTakenMs)
          ? Math.floor(body.timeTakenMs)
          : 0;
      const out = await submitSinglePlayerGuess({
        gameId,
        identity,
        guessText,
        timeTakenMs,
      });
      return c.json(out);
    } catch (e) {
      return handleErr(c, e);
    }
  });
