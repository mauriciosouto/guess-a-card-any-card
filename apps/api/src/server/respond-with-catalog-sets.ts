import type { Context } from "hono";
import { getAllSets, isCardCatalogReady } from "@/server/services/card-catalog-service";

/**
 * Shared handler for `GET …/sets` — FAB release names from the in-memory card catalog.
 */
export function respondWithCatalogSets(c: Context) {
  if (!isCardCatalogReady()) {
    return c.json(
      { error: "Card catalog is unavailable. Try again shortly." },
      503,
    );
  }
  return c.json({ sets: getAllSets() });
}
