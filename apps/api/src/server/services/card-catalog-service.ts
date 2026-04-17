import { cards as fabCards } from "@flesh-and-blood/cards";
import type { Card, Printing } from "@flesh-and-blood/types";
import { Foiling, Rarity, Type } from "@flesh-and-blood/types";

/**
 * One playable catalog row: a specific FAB printing that passed filters.
 * `id` is stable for a given @flesh-and-blood/cards version (uses printing index in source array).
 */
export type CatalogCard = {
  id: string;
  cardIdentifier: string;
  printingIdentifier: string;
  /** Index in the source card’s `printings` array (stable for a package version). */
  printingIndex: number;
  name: string;
  /**
   * Image key from FAB data (`printing.image` or fallback). Same shape admin / CDN resolution uses today.
   */
  imageUrl: string;
  /** `Release` string for this printing (lobby set filter). */
  setKey: string;
  fabCard: Card;
  printing: Printing;
};

export class CardCatalogLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CardCatalogLoadError";
  }
}

let allCards: CatalogCard[] = [];
let cardsBySet: Map<string, CatalogCard[]> = new Map();
let cardById: Map<string, CatalogCard> = new Map();
/** Sorted unique display names from {@link allCards} only (same filters as random deal). */
let sortedPlayableUniqueNames: string[] = [];
let catalogReady = false;

function rebuildSortedPlayableNames(): void {
  const seen = new Set<string>();
  for (const row of allCards) {
    const n = row.name.trim();
    if (n) seen.add(n);
  }
  sortedPlayableUniqueNames = [...seen].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export function isCardCatalogReady(): boolean {
  return catalogReady;
}

function cardHasRarity(card: Card, rarity: Rarity): boolean {
  if (card.rarities?.includes(rarity)) return true;
  const legacy = (card as { rarity?: Rarity }).rarity;
  return legacy === rarity;
}

function isTokenCard(card: Card): boolean {
  if (card.types?.includes(Type.Token)) return true;
  return cardHasRarity(card, Rarity.Token);
}

function isMarvel(card: Card, printing: Printing): boolean {
  if (cardHasRarity(card, Rarity.Marvel)) return true;
  return printing.rarity === Rarity.Marvel;
}

function isPromo(card: Card, printing: Printing): boolean {
  if (cardHasRarity(card, Rarity.Promo)) return true;
  return printing.rarity === Rarity.Promo;
}

function isExcludedFoiling(printing: Printing): boolean {
  return (
    printing.foiling === Foiling.C ||
    printing.foiling === Foiling.G
  );
}

function isBackFaceImageKey(imageKey: string): boolean {
  return /_BACK(?:\.|$|[-_])/i.test(imageKey) || /-back$/i.test(imageKey);
}

function resolveImageSource(card: Card, printing: Printing): string | null {
  const raw = (printing.image ?? card.defaultImage ?? "").trim();
  if (!raw) return null;
  if (isBackFaceImageKey(raw)) return null;
  return raw;
}

function shouldIncludePrinting(card: Card, printing: Printing): boolean {
  if (isTokenCard(card)) return false;
  if (isMarvel(card, printing)) return false;
  if (isPromo(card, printing)) return false;
  if (isExcludedFoiling(printing)) return false;
  return resolveImageSource(card, printing) != null;
}

function makeCatalogId(card: Card, printingIndex: number, printing: Printing): string {
  return `${card.cardIdentifier}::${printingIndex}::${printing.identifier}`;
}

/**
 * Builds in-memory indexes from raw FAB cards. Exported for unit tests.
 */
export function buildCatalogFromFaBCards(source: Card[]): {
  allCards: CatalogCard[];
  cardsBySet: Map<string, CatalogCard[]>;
  cardById: Map<string, CatalogCard>;
} {
  const list: CatalogCard[] = [];
  const bySet = new Map<string, CatalogCard[]>();
  const byId = new Map<string, CatalogCard>();

  for (const fabCard of source) {
    if (fabCard.isCardBack) continue;

    const printings = fabCard.printings ?? [];
    printings.forEach((printing, printingIndex) => {
      if (!shouldIncludePrinting(fabCard, printing)) return;

      const imageUrl = resolveImageSource(fabCard, printing);
      if (!imageUrl) return;

      const setKey = String(printing.set);
      const id = makeCatalogId(fabCard, printingIndex, printing);

      const row: CatalogCard = {
        id,
        cardIdentifier: fabCard.cardIdentifier,
        printingIdentifier: printing.identifier,
        printingIndex,
        name: fabCard.name,
        imageUrl,
        setKey,
        fabCard,
        printing,
      };
      list.push(row);
      byId.set(id, row);
      const bucket = bySet.get(setKey);
      if (bucket) bucket.push(row);
      else bySet.set(setKey, [row]);
    });
  }

  for (const [, bucket] of bySet) {
    bucket.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: "base" }));
  }
  list.sort((a, b) => a.id.localeCompare(b.id, undefined, { sensitivity: "base" }));

  return { allCards: list, cardsBySet: bySet, cardById: byId };
}

/**
 * Loads the official FAB catalog into memory. Call once at process startup.
 * @throws {CardCatalogLoadError} when no playable rows remain after filtering.
 */
function applyBuiltCatalog(built: {
  allCards: CatalogCard[];
  cardsBySet: Map<string, CatalogCard[]>;
  cardById: Map<string, CatalogCard>;
}): void {
  allCards = built.allCards;
  cardsBySet = built.cardsBySet;
  cardById = built.cardById;
  rebuildSortedPlayableNames();
}

/**
 * Replaces catalog state (for Vitest only).
 */
export function __applyCatalogForTests(built: ReturnType<typeof buildCatalogFromFaBCards>): void {
  applyBuiltCatalog(built);
  catalogReady = built.allCards.length > 0;
}

export function __clearCatalogForTests(): void {
  allCards = [];
  cardsBySet = new Map();
  cardById = new Map();
  sortedPlayableUniqueNames = [];
  catalogReady = false;
}

export function initCardCatalog(): void {
  catalogReady = false;
  const built = buildCatalogFromFaBCards(fabCards);
  applyBuiltCatalog(built);

  const setCount = cardsBySet.size;
  console.log(
    `[gac-api] card catalog: loaded ${allCards.length} playable printings across ${setCount} sets`,
  );

  if (allCards.length === 0) {
    const msg =
      "Card catalog is empty after filtering — check @flesh-and-blood/cards data and filter rules.";
    console.error(`[gac-api] card catalog: FATAL — ${msg}`);
    throw new CardCatalogLoadError(msg);
  }

  catalogReady = true;
}

export function getAllSets(): string[] {
  return [...cardsBySet.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

/** Resolve a playable catalog printing by stable {@link CatalogCard.id}, or null. */
export function getCatalogCardById(id: string): CatalogCard | null {
  if (!catalogReady) return null;
  return cardById.get(id) ?? null;
}

/** First playable printing whose name matches exactly (case-insensitive), or null. */
export function getFirstCatalogCardIdByExactName(name: string): string | null {
  if (!catalogReady) return null;
  const t = name.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const c of allCards) {
    if (c.name.trim().toLowerCase() === lower) return c.id;
  }
  return null;
}

/**
 * Substring match (case-insensitive) on **playable** catalog card names only
 * (tokens, promos, marvel, gold/cold foil printings excluded — same universe as {@link getRandomCard}).
 * Returns [] when the catalog is not ready. Caller should enforce min query length (e.g. 3).
 */
export function searchPlayableCatalogCardNames(query: string, limit = 20): string[] {
  if (!catalogReady || sortedPlayableUniqueNames.length === 0) return [];

  const q = query.trim();
  if (q.length < 3) return [];

  const qLower = q.toLowerCase();
  const out: string[] = [];
  for (const name of sortedPlayableUniqueNames) {
    if (!name.toLowerCase().includes(qLower)) continue;
    out.push(name);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * @param selectedSets empty or omitted = all playable cards (any set).
 */
export function getCardsBySets(selectedSets?: readonly string[]): CatalogCard[] {
  if (!selectedSets || selectedSets.length === 0) {
    return [...allCards];
  }
  const set = new Set(selectedSets);
  const out: CatalogCard[] = [];
  for (const card of allCards) {
    if (set.has(card.setKey)) out.push(card);
  }
  return out;
}

/**
 * Uniform random playable printing, optionally restricted to sets and excluding catalog ids.
 * If the pool is empty only because of exclusions, falls back to unexcluded pool.
 */
export function getRandomCard(
  selectedSets: readonly string[],
  excludeCardIds?: ReadonlySet<string> | readonly string[],
): CatalogCard | null {
  const exclude =
    excludeCardIds == null
      ? new Set<string>()
      : excludeCardIds instanceof Set
        ? excludeCardIds
        : new Set(excludeCardIds);

  const basePool = getCardsBySets(selectedSets);
  const tryPool = (pool: CatalogCard[]) => {
    if (pool.length === 0) return null;
    if (exclude.size === 0) {
      return pool[Math.floor(Math.random() * pool.length)]!;
    }
    const filtered = pool.filter((c) => !exclude.has(c.id));
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)]!;
    }
    return pool[Math.floor(Math.random() * pool.length)]!;
  };

  return tryPool(basePool);
}
