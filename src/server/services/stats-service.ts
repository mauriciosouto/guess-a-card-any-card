import {
  applyGameOutcomeToUserStats,
  ensureUserStatRow,
  type GameOutcomeForStats,
} from "@/server/repositories/stats-repository";

export type { GameOutcomeForStats };

export async function ensureStatsForUser(userId: string): Promise<void> {
  await ensureUserStatRow(userId);
}

export async function recordRegisteredUserGameOutcome(
  outcome: GameOutcomeForStats,
): Promise<void> {
  await applyGameOutcomeToUserStats(outcome);
}
