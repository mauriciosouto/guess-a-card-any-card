import {
  DEFAULT_REVEAL_CARD,
  DEFAULT_REVEAL_TEMPLATE_KEY,
  getRevealPlanTotalSteps,
  type CardTemplateKey,
  type CardZoneValidityKind,
} from "@gac/shared/reveal";

export type PuzzleRevealProfile = {
  cardKind: CardZoneValidityKind;
  templateKey: CardTemplateKey;
};

/** Until puzzles store FAB classification, all games share this profile (must match client). */
export function defaultPuzzleRevealProfile(): PuzzleRevealProfile {
  return {
    cardKind: DEFAULT_REVEAL_CARD.kind,
    templateKey: DEFAULT_REVEAL_TEMPLATE_KEY,
  };
}

export function puzzleRevealTotalSteps(puzzle: { seed: string }): number {
  const { templateKey } = defaultPuzzleRevealProfile();
  return getRevealPlanTotalSteps(DEFAULT_REVEAL_CARD, templateKey, puzzle.seed);
}
