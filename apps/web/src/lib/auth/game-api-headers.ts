import { getOrCreateGuestId } from "@/lib/coop/guest-id";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Merges identity headers for game API calls (single + challenge).
 * Always sends `x-guest-id` when available; adds `Authorization` when a session exists.
 */
export function mergeActorAuthHeaders(
  headers: Headers,
  guestId: string,
  accessToken: string | null | undefined,
): void {
  if (guestId) {
    headers.set("x-guest-id", guestId);
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
}

/**
 * Returns a Supabase access token suitable for `Authorization: Bearer` on the game API.
 * Proactively refreshes when the session is missing or near expiry so `/api/profile/me` and
 * other authenticated routes do not 401 while the UI still shows a signed-in user.
 */
export async function getSupabaseAccessTokenForApi(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  /** Refresh slightly before expiry — stale JWTs fail API JWKS verification and yield 401. */
  const skewSec = 90;
  const expiresAt = session.expires_at ?? 0;

  if (expiresAt < nowSec + skewSec) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session?.access_token) {
      return null;
    }
    return refreshed.session.access_token;
  }

  return session.access_token;
}

/** Builds headers for a game API `fetch` (client-side). */
export async function buildGameApiRequestHeaders(
  base?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(base);
  const guestId = getOrCreateGuestId();
  const accessToken = await getSupabaseAccessTokenForApi();
  mergeActorAuthHeaders(headers, guestId, accessToken);
  return headers;
}
