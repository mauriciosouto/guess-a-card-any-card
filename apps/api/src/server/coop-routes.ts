import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  CoopHttpError,
  createCoopRoom,
  dismissCoopCircleByHostAfterGame,
  getCoopRoomPublic,
  hostEndCoopGame,
  joinCoopRoom,
  leaveCoopRoom,
  setCoopPlayerConnected,
  startCoopGame,
  submitCoopGuess,
  updateCoopSelectedSets,
} from "@/server/services/coop-service";
import { respondWithCatalogSets } from "@/server/respond-with-catalog-sets";

function requireGuestHeader(c: { req: { header: (n: string) => string | undefined } }): string {
  const gid = c.req.header("x-guest-id")?.trim();
  if (!gid) throw new CoopHttpError(400, "Missing X-Guest-Id header.");
  return gid;
}

function handleCoopErr(c: Context, e: unknown) {
  if (e instanceof CoopHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const coopRoutes = new Hono()
  .get("/sets", (c) => respondWithCatalogSets(c))
  .post("/rooms", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const body = (await c.req.json().catch(() => ({}))) as { displayName?: string };
      const r = await createCoopRoom({
        hostGuestId: guestId,
        displayName: typeof body.displayName === "string" ? body.displayName : "",
      });
      return c.json(r, 201);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/join", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const body = (await c.req.json().catch(() => ({}))) as { displayName?: string };
      await joinCoopRoom({
        roomId,
        guestId,
        displayName: typeof body.displayName === "string" ? body.displayName : "",
      });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .get("/rooms/:roomId", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const snap = await getCoopRoomPublic({ roomId, viewerGuestId: guestId });
      return c.json(snap);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .patch("/rooms/:roomId/sets", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const body = (await c.req.json().catch(() => ({}))) as { selectedSets?: string[] };
      const selectedSets = Array.isArray(body.selectedSets)
        ? body.selectedSets.filter((s): s is string => typeof s === "string")
        : [];
      await updateCoopSelectedSets({ roomId, hostGuestId: guestId, selectedSets });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/start", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const out = await startCoopGame({ roomId, hostGuestId: guestId });
      return c.json(out);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/leave", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      await leaveCoopRoom({ roomId, guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/end-game", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      await hostEndCoopGame({ roomId, hostGuestId: guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/dismiss-after-game", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      await dismissCoopCircleByHostAfterGame({ roomId, hostGuestId: guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .patch("/rooms/:roomId/players/:playerId/connection", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = c.req.param("roomId");
      const targetRoomPlayerId = c.req.param("playerId");
      const body = (await c.req.json().catch(() => ({}))) as { isConnected?: boolean };
      if (typeof body.isConnected !== "boolean") {
        return c.json({ error: "Body must include boolean isConnected." }, 400);
      }
      await setCoopPlayerConnected({
        roomId,
        hostGuestId: guestId,
        targetRoomPlayerId,
        isConnected: body.isConnected,
      });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
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
      const out = await submitCoopGuess({ gameId, submitterGuestId: guestId, guessText, timeTakenMs });
      return c.json(out);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  });
