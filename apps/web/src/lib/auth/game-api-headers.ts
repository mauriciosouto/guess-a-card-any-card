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

export async function getSupabaseAccessTokenForApi(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
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
