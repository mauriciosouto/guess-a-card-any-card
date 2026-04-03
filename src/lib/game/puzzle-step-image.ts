import type { Puzzle, PuzzleStep } from "@/generated/prisma/client";

/**
 * Prefer per-step asset from admin export; fall back to puzzle hero image.
 */
export function resolveStepImageUrl(
  puzzle: Pick<Puzzle, "imageUrl">,
  stepRow: Pick<PuzzleStep, "imageUrl"> | null | undefined,
): string {
  const fromStep = stepRow?.imageUrl?.trim();
  if (fromStep) return fromStep;
  return puzzle.imageUrl;
}
