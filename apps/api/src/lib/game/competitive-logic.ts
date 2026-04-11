import { resolveSinglePlayerGuess } from "@/lib/game/single-player-logic";

/**
 * Competitive mode — blueprint §28.9: synchronized steps; one guess per player per step;
 * same card resolution as single-player per guess.
 */
export type CompetitiveRoundResolution =
  | { outcome: "solved" }
  | { outcome: "eliminated" }
  | { outcome: "continue" };

export function resolveCompetitiveGuessOnStep(params: {
  currentStep: number;
  totalSteps: number;
  normalizedGuess: string;
  normalizedCardName: string;
}): CompetitiveRoundResolution {
  const r = resolveSinglePlayerGuess(params);
  if (r.outcome === "win") return { outcome: "solved" };
  if (r.outcome === "lose") return { outcome: "eliminated" };
  return { outcome: "continue" };
}

export type RankableCompetitivePlayer = {
  id: string;
  competitiveState: "SOLVED" | "ELIMINATED" | "RACING" | null;
  attemptCount: number;
  totalTimeMs: number;
};

/** Lower rank number = better. SOLVED beats ELIMINATED; ties break by time then id. */
export function assignCompetitiveRanks(
  players: RankableCompetitivePlayer[],
): Map<string, number> {
  const solved = players.filter((p) => p.competitiveState === "SOLVED");
  const eliminated = players.filter((p) => p.competitiveState === "ELIMINATED");
  const racing = players.filter((p) => p.competitiveState === "RACING");

  const sortKey = (p: RankableCompetitivePlayer) => [
    p.attemptCount,
    p.totalTimeMs,
    p.id,
  ] as const;

  solved.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return ka[2].localeCompare(kb[2]);
  });
  eliminated.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return ka[2].localeCompare(kb[2]);
  });

  const out = new Map<string, number>();
  let rank = 1;
  for (const p of solved) out.set(p.id, rank++);
  for (const p of eliminated) out.set(p.id, rank++);
  for (const p of racing) out.set(p.id, rank++);
  return out;
}
