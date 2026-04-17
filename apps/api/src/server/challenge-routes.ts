import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  ChallengeHttpError,
  createChallenge,
  getChallengePublic,
  getChallengeResult,
  startChallenge,
} from "@/server/services/challenge-service";
import { parsePlayerIdentityFromHeaders } from "@/server/services/single-player-service";

function handleErr(c: Context, e: unknown) {
  if (e instanceof ChallengeHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const challengeRoutes = new Hono()
  .post("/", async (c) => {
    try {
      const hostIdentity = parsePlayerIdentityFromHeaders(c.req.raw.headers);
      const body = (await c.req.json().catch(() => ({}))) as { cardId?: string };
      const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
      if (!cardId) {
        return c.json({ error: "cardId is required." }, 400);
      }
      const out = await createChallenge({ cardId, hostIdentity });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const out = await getChallengePublic(id);
      return c.json(out);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/:id/start", async (c) => {
    try {
      const playerIdentity = parsePlayerIdentityFromHeaders(c.req.raw.headers);
      const challengeId = c.req.param("id");
      const out = await startChallenge({ challengeId, playerIdentity });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/:id/result", async (c) => {
    try {
      const hostIdentity = parsePlayerIdentityFromHeaders(c.req.raw.headers);
      const challengeId = c.req.param("id");
      const out = await getChallengeResult({ challengeId, hostIdentity });
      return c.json(out);
    } catch (e) {
      return handleErr(c, e);
    }
  });
