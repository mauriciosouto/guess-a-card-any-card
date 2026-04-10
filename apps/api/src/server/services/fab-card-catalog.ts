import { cards } from "@flesh-and-blood/cards";

/**
 * Sorted unique playable card display names from the official FaB catalog package.
 */
const SORTED_UNIQUE_CARD_NAMES: string[] = (() => {
  const seen = new Set<string>();
  for (const card of cards) {
    if (card.isCardBack) continue;
    const n = card.name?.trim();
    if (n) seen.add(n);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
})();

/**
 * Substring match (case-insensitive), results in alphabetical order. Caller enforces min length.
 */
export function searchFabCatalogCardNames(query: string, limit = 20): string[] {
  const q = query.trim();
  if (q.length < 3) return [];

  const qLower = q.toLowerCase();
  const out: string[] = [];
  for (const name of SORTED_UNIQUE_CARD_NAMES) {
    if (!name.toLowerCase().includes(qLower)) continue;
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}
