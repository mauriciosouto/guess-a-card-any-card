import { generateStep } from "@/lib/puzzle/deterministicStep";

/**
 * Per-step overlay regions for the puzzle preview. **Stateless:** derived only from
 * `puzzleSeed` and `step` (see `generateStep`).
 */
export function generateRegions(puzzleSeed: string, step: number) {
  return generateStep(puzzleSeed, step).regions;
}
