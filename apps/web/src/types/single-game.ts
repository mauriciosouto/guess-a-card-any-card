import type { CardTemplateKey, CardZoneValidityKind } from "@gac/shared/reveal";

/** Mirrors `SingleGamePublic` from the API (`GET/POST /api/single/games/...`). */
export type SingleGameSnapshot = {
  id: string;
  status: string;
  currentStep: number | null;
  totalSteps: number;
  cardImageUrl: string;
  puzzleSeed: string;
  currentImageUrl: string | null;
  revealCardKind: CardZoneValidityKind;
  cardTemplateKey: CardTemplateKey;
  cardName: string | null;
  dataSource: string | null;
  fabSet: string | null;
  attemptCount: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  guesses: Array<{
    id: string;
    stepNumber: number;
    guessText: string;
    isCorrect: boolean;
    createdAt: string;
  }>;
};
