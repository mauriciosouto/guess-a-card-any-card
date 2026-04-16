import { cards as fabCards } from "@flesh-and-blood/cards";
import type { Card, Printing } from "@flesh-and-blood/types";
import { Foiling, Rarity, Release, Type } from "@flesh-and-blood/types";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  __applyCatalogForTests,
  buildCatalogFromFaBCards,
  getAllSets,
  getCardsBySets,
  getRandomCard,
  initCardCatalog,
  searchPlayableCatalogCardNames,
} from "./card-catalog-service";

function printing(p: Partial<Printing> & Pick<Printing, "identifier" | "set">): Printing {
  return {
    artists: [],
    rarity: Rarity.Common,
    ...p,
  } as Printing;
}

function fab(card: Partial<Card> & Pick<Card, "name" | "cardIdentifier">): Card {
  return {
    artists: ["x"],
    classes: [],
    defaultImage: "fallback-img",
    legalFormats: [],
    legalHeroes: [],
    printings: [],
    rarities: [Rarity.Common],
    setIdentifiers: [],
    sets: [],
    subtypes: [],
    types: [Type.Action],
    typeText: "Action",
    ...card,
  } as Card;
}

describe("card-catalog-service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    initCardCatalog();
  });

  it("filters out tokens, marvel, promo, cold/gold foil, back images, and missing art", () => {
    const source: Card[] = [
      fab({
        name: "Playable",
        cardIdentifier: "playable-red",
        printings: [
          printing({
            identifier: "P1",
            set: Release.Monarch,
            image: "MON001",
          }),
        ],
      }),
      fab({
        name: "Token",
        cardIdentifier: "token-x",
        types: [Type.Token],
        rarities: [Rarity.Token],
        printings: [
          printing({
            identifier: "T1",
            set: Release.Monarch,
            image: "TOK1",
          }),
        ],
      }),
      fab({
        name: "Marvel",
        cardIdentifier: "marvel-x",
        rarities: [Rarity.Marvel],
        printings: [
          printing({
            identifier: "M1",
            set: Release.Monarch,
            image: "MV1",
            rarity: Rarity.Marvel,
          }),
        ],
      }),
      fab({
        name: "Promo print",
        cardIdentifier: "promo-x",
        printings: [
          printing({
            identifier: "PR1",
            set: Release.Monarch,
            image: "PR1",
            rarity: Rarity.Promo,
          }),
        ],
      }),
      fab({
        name: "Cold",
        cardIdentifier: "cold-x",
        printings: [
          printing({
            identifier: "C1",
            set: Release.Monarch,
            image: "C1",
            foiling: Foiling.C,
          }),
        ],
      }),
      fab({
        name: "Gold",
        cardIdentifier: "gold-x",
        printings: [
          printing({
            identifier: "G1",
            set: Release.Monarch,
            image: "G1",
            foiling: Foiling.G,
          }),
        ],
      }),
      fab({
        name: "Back art",
        cardIdentifier: "back-x",
        printings: [
          printing({
            identifier: "B1",
            set: Release.Monarch,
            image: "CARD_BACK",
          }),
        ],
      }),
      fab({
        name: "No image",
        cardIdentifier: "noimg-x",
        defaultImage: "",
        printings: [
          printing({
            identifier: "N1",
            set: Release.Monarch,
            image: "",
          }),
        ],
      }),
    ];

    const { allCards } = buildCatalogFromFaBCards(source);
    expect(allCards).toHaveLength(1);
    expect(allCards[0]!.name).toBe("Playable");
  });

  it("derives sorted set keys from playable printings", () => {
    const source: Card[] = [
      fab({
        name: "A",
        cardIdentifier: "a-red",
        printings: [
          printing({ identifier: "X1", set: Release.Uprising, image: "U1" }),
        ],
      }),
      fab({
        name: "B",
        cardIdentifier: "b-red",
        printings: [
          printing({ identifier: "X2", set: Release.Monarch, image: "M1" }),
          printing({ identifier: "X3", set: Release.Dynasty, image: "D1" }),
        ],
      }),
    ];

    const built = buildCatalogFromFaBCards(source);
    __applyCatalogForTests(built);

    expect(getAllSets()).toEqual([
      String(Release.Dynasty),
      String(Release.Monarch),
      String(Release.Uprising),
    ]);
  });

  it("getCardsBySets: empty selection returns full catalog; non-empty filters by set", () => {
    const source: Card[] = [
      fab({
        name: "M",
        cardIdentifier: "m-red",
        printings: [
          printing({ identifier: "1", set: Release.Monarch, image: "a" }),
        ],
      }),
      fab({
        name: "D",
        cardIdentifier: "d-red",
        printings: [
          printing({ identifier: "2", set: Release.Dynasty, image: "b" }),
        ],
      }),
    ];
    __applyCatalogForTests(buildCatalogFromFaBCards(source));

    expect(getCardsBySets([])).toHaveLength(2);
    expect(getCardsBySets([String(Release.Monarch)])).toHaveLength(1);
    expect(getCardsBySets([String(Release.Monarch)])[0]!.name).toBe("M");
  });

  it("getRandomCard: respects selected set", () => {
    const source: Card[] = [
      fab({
        name: "M",
        cardIdentifier: "m-red",
        printings: [
          printing({ identifier: "1", set: Release.Monarch, image: "a" }),
        ],
      }),
      fab({
        name: "D",
        cardIdentifier: "d-red",
        printings: [
          printing({ identifier: "2", set: Release.Dynasty, image: "b" }),
        ],
      }),
    ];
    __applyCatalogForTests(buildCatalogFromFaBCards(source));

    vi.spyOn(Math, "random").mockReturnValue(0);
    const pick = getRandomCard([String(Release.Dynasty)], []);
    expect(pick?.setKey).toBe(String(Release.Dynasty));
    expect(pick?.name).toBe("D");
  });

  it("getRandomCard: when every card is excluded, falls back to unfiltered pool", () => {
    const source: Card[] = [
      fab({
        name: "Only",
        cardIdentifier: "only-red",
        printings: [
          printing({ identifier: "1", set: Release.Monarch, image: "a" }),
        ],
      }),
    ];
    __applyCatalogForTests(buildCatalogFromFaBCards(source));

    vi.spyOn(Math, "random").mockReturnValue(0);
    const id = getCardsBySets([])[0]!.id;
    const pick = getRandomCard([], new Set([id]));
    expect(pick?.id).toBe(id);
  });

  it("integration: official package produces a large playable catalog", () => {
    const built = buildCatalogFromFaBCards(fabCards);
    expect(built.allCards.length).toBeGreaterThan(2_000);
    expect(built.cardsBySet.size).toBeGreaterThan(10);
    const token = built.allCards.filter((c) => c.fabCard.types?.includes(Type.Token));
    expect(token).toHaveLength(0);
  });

  it("searchPlayableCatalogCardNames only searches playable rows, not filtered-out tokens", () => {
    const source: Card[] = [
      fab({
        name: "Visible Strike",
        cardIdentifier: "visible-red",
        printings: [
          printing({ identifier: "V1", set: Release.Monarch, image: "V1" }),
        ],
      }),
      fab({
        name: "Hidden Bee Token",
        cardIdentifier: "bee-token",
        types: [Type.Token],
        rarities: [Rarity.Token],
        printings: [
          printing({ identifier: "T1", set: Release.Monarch, image: "T1" }),
        ],
      }),
    ];
    __applyCatalogForTests(buildCatalogFromFaBCards(source));
    expect(searchPlayableCatalogCardNames("hid", 20)).toEqual([]);
    expect(searchPlayableCatalogCardNames("vis", 20)).toEqual(["Visible Strike"]);
  });

  it("searchPlayableCatalogCardNames returns [] when playable list is empty", () => {
    __applyCatalogForTests(buildCatalogFromFaBCards([]));
    expect(searchPlayableCatalogCardNames("vis", 20)).toEqual([]);
  });
});
