import { randomBytes } from "node:crypto";

import type { Game } from "@/generated/prisma/client";
import { resolveCatalogCardArtUrl } from "@/lib/card-art-url";
import { gameRevealTotalSteps } from "@/lib/reveal-profile";
import { getCatalogCardById } from "@/server/services/card-catalog-service";
import type { CardTemplateKey, CardZoneValidityKind } from "@gac/shared/reveal";

export function newRevealSeed(): string {
  return randomBytes(16).toString("hex");
}

export type GameCardResolution = {
  cardName: string;
  cardImageUrl: string;
  seed: string;
  revealCardKind: CardZoneValidityKind;
  cardTemplateKey: CardTemplateKey;
  fabSet: string | null;
  dataSource: string | null;
  totalSteps: number;
};

export type GameForCardResolution = Game;

export function resolveGameCard(game: GameForCardResolution): GameCardResolution {
  const revealCardKind = game.revealCardKind as CardZoneValidityKind;
  const cardTemplateKey = game.cardTemplateKey as CardTemplateKey;
  const catalog = getCatalogCardById(game.cardId);
  const cardImageUrl = catalog
    ? resolveCatalogCardArtUrl(catalog.imageUrl, catalog.printing)
    : game.cardImageUrl;
  return {
    cardName: game.cardName,
    cardImageUrl,
    seed: game.revealSeed,
    revealCardKind,
    cardTemplateKey,
    fabSet: game.cardSet ?? null,
    dataSource: "fab",
    totalSteps: gameRevealTotalSteps({
      seed: game.revealSeed,
      revealCardKind,
      cardTemplateKey,
    }),
  };
}
