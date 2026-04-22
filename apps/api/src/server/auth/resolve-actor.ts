import { actorToPlayerIdentity, type Actor, type UserActor } from "@/lib/actor";
import type { PlayerIdentity } from "@/lib/player-identity";
import { ensureLocalUserForAuth } from "@/server/auth/ensure-local-user";
import { RequestIdentityError } from "@/server/auth/request-identity-error";
import {
  verifySupabaseAccessToken,
  type VerifiedAccessToken,
} from "@/server/auth/supabase-jwt";

export type ResolveActorOptions = {
  /**
   * Override JWT verification (tests) or short-circuit remote JWKS.
   * Return verified claims or null when the token is missing/invalid.
   */
  verifyAccessToken?: (rawToken: string) => Promise<VerifiedAccessToken | null>;
};

function extractBearerToken(headers: Headers): string | null {
  const raw = headers.get("authorization")?.trim();
  if (!raw) return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  if (!m) return null;
  const t = m[1]!.trim();
  return t.length > 0 ? t : null;
}

async function defaultVerifyAccessToken(
  rawToken: string,
): Promise<VerifiedAccessToken | null> {
  return verifySupabaseAccessToken(rawToken);
}

/**
 * Resolves the caller as UserActor (verified JWT) or GuestActor (`x-guest-id`).
 * JWT wins when present and verifiable; invalid JWT falls back to guest when `x-guest-id` is set.
 */
export async function resolveActorFromRequest(
  headers: Headers,
  options?: ResolveActorOptions,
): Promise<Actor> {
  const verify = options?.verifyAccessToken ?? defaultVerifyAccessToken;

  const bearer = extractBearerToken(headers);
  if (bearer) {
    const verified = await verify(bearer);
    if (verified) {
      await ensureLocalUserForAuth(verified.sub, {
        email: verified.email,
        avatarUrl: verified.avatarUrl,
      });
      return { kind: "user", userId: verified.sub };
    }
  }

  const rawGuest = headers.get("x-guest-id")?.trim() ?? "";
  if (rawGuest.length > 0) {
    return { kind: "guest", guestId: rawGuest };
  }

  throw new RequestIdentityError(
    401,
    "Authentication required: send Authorization Bearer token or X-Guest-Id.",
  );
}

export async function resolvePlayerIdentityForGameRequest(
  headers: Headers,
  options?: ResolveActorOptions,
): Promise<PlayerIdentity> {
  const actor = await resolveActorFromRequest(headers, options);
  return actorToPlayerIdentity(actor);
}

/** Fails with {@link RequestIdentityError} 401 if the caller is not a verified user. */
export async function requireUserActor(
  headers: Headers,
  options?: ResolveActorOptions,
): Promise<UserActor> {
  const actor = await resolveActorFromRequest(headers, options);
  if (actor.kind !== "user") {
    throw new RequestIdentityError(
      401,
      "Sign in to view this resource.",
    );
  }
  return actor;
}

/**
 * Resolves a verified user id from `Authorization: Bearer` when the token is valid; otherwise
 * `null` (no guest fallback). For optional auth on public endpoints.
 */
export async function tryResolveUserIdFromRequest(
  headers: Headers,
  options?: ResolveActorOptions,
): Promise<string | null> {
  const verify = options?.verifyAccessToken ?? defaultVerifyAccessToken;
  const bearer = extractBearerToken(headers);
  if (!bearer) {
    return null;
  }
  const verified = await verify(bearer);
  if (!verified) {
    return null;
  }
  await ensureLocalUserForAuth(verified.sub, {
    email: verified.email,
    avatarUrl: verified.avatarUrl,
  });
  return verified.sub;
}
