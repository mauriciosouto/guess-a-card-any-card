import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { respondWithCatalogSets } from "@/server/respond-with-catalog-sets";
import {
  CompetitiveHttpError,
  createCompetitiveRoom,
  getCompetitiveRoomPublic,
  joinCompetitiveRoom,
  leaveCompetitiveRoom,
  startCompetitiveGame,
  submitCompetitiveGuess,
  updateCompetitiveSelectedSets,
  updateCompetitiveTimer,
} from "@/server/services/competitive-service";

function requireGuestHeader(c: { req: { header: (n: string) => string | undefined } }): string {
  const gid = c.req.header("x-guest-id")?.trim();
  if (!gid) throw new CompetitiveHttpError(400, "Missing X-Guest-Id header.");
  return gid;
}

function handleErr(c: Context, e: unknown) {
  if (e instanceof CompetitiveHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const competitiveRoutes = new Hono()
  .get("/sets", (c) => respondWithCatalogSets(c))
  .post("/rooms", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const body = (await c.req.json().catch(() => ({}))) as { displayName?: string };
      const out = await createCompetitiveRoom({
        hostGuestId: guestId,
        displayName: typeof body.displayName === "string" ? body.displayName : "",
      });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/rooms/:roomId/join", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const body = (await c.req.json().catch(() => ({}))) as { displayName?: string };
      await joinCompetitiveRoom({
        roomId,
        guestId,
        displayName: typeof body.displayName === "string" ? body.displayName : "",
      });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/rooms/:roomId", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const snap = await getCompetitiveRoomPublic({ roomId, viewerGuestId: guestId });
      return c.json(snap);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .patch("/rooms/:roomId/sets", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const body = (await c.req.json().catch(() => ({}))) as { selectedSets?: string[] };
      const raw = Array.isArray(body.selectedSets) ? body.selectedSets : [];
      const selectedSets = raw
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await updateCompetitiveSelectedSets({ roomId, hostGuestId: guestId, selectedSets });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .patch("/rooms/:roomId/timer", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const body = (await c.req.json().catch(() => ({}))) as { timerPerStepSeconds?: number };
      const t =
        typeof body.timerPerStepSeconds === "number" && Number.isFinite(body.timerPerStepSeconds)
          ? body.timerPerStepSeconds
          : 90;
      await updateCompetitiveTimer({ roomId, hostGuestId: guestId, timerPerStepSeconds: t });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/rooms/:roomId/start", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const out = await startCompetitiveGame({ roomId, hostGuestId: guestId });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/rooms/:roomId/leave", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      await leaveCompetitiveRoom({ roomId, guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/games/:gameId/guess", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
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
      await submitCompetitiveGuess({ gameId, guestId, guessText, timeTakenMs });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  });
