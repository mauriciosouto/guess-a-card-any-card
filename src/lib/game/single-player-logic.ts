import { guessesAreEqual } from "@/lib/game/guess-normalize";

/**
 * Pure single-player rules (BLUEPRINT §3.1) — one guess per step; advance on wrong;
 * lose if wrong on the final step; win on normalized name match.
 */
export type SinglePlayerGuessResolution =
  | { outcome: "win" }
  | { outcome: "lose" }
  | { outcome: "advance"; nextStep: number };

export function resolveSinglePlayerGuess(params: {
  /** 1-based step index. */
  currentStep: number;
  totalSteps: number;
  normalizedGuess: string;
  normalizedCardName: string;
}): SinglePlayerGuessResolution {
  const { currentStep, totalSteps, normalizedGuess, normalizedCardName } = params;

  if (guessesAreEqual(normalizedGuess, normalizedCardName)) {
    return { outcome: "win" };
  }

  if (currentStep >= totalSteps) {
    return { outcome: "lose" };
  }

  return { outcome: "advance", nextStep: currentStep + 1 };
}

/** Attempts used / remaining for UI (one attempt per step maximum). */
export function singlePlayerAttemptCounts(totalSteps: number, guessesSoFar: number): {
  used: number;
  remaining: number;
} {
  const used = guessesSoFar;
  const remaining = Math.max(0, totalSteps - used);
  return { used, remaining };
}
