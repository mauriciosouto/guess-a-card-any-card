const STORAGE_KEY = "gac-guest-id";

/** Stable anonymous id for COOP REST (until Supabase auth is wired). */
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
