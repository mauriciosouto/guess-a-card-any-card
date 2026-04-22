import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { RequestIdentityError } from "@/server/auth/request-identity-error";
import { requireUserActor } from "@/server/auth/resolve-actor";
import { getPublicProfileByUserId } from "@/server/services/profile-service";

function handleErr(c: Context, e: unknown) {
  if (e instanceof RequestIdentityError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

/**
 * `GET /api/me` — same profile payload as `GET /api/profile/me` (session identity + stats + activity).
 */
export const meRoutes = new Hono().get("/", async (c) => {
  try {
    const { userId } = await requireUserActor(c.req.raw.headers);
    const body = await getPublicProfileByUserId(userId, { includeEmail: true });
    if (!body) {
      return c.json({ error: "User not found." }, 404);
    }
    return c.json(body);
  } catch (e) {
    return handleErr(c, e);
  }
});
