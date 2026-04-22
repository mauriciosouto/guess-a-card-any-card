import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type UserCardStatMergeArgs = {
  userId: string;
  cardId: string;
  won: boolean;
  attempts: number;
  durationMs: number;
};

/**
 * Per-card aggregates: `timesPlayed` counts every completion; `averageAttempts` / `averageTimeMs`
 * update on **wins only** (rolling mean over winning plays), matching existing behavior.
 */
export async function mergeUserCardStatsAfterGameInTx(
  tx: Prisma.TransactionClient,
  args: UserCardStatMergeArgs,
): Promise<void> {
  const { userId, cardId, won, attempts, durationMs } = args;

  const existing = await tx.userCardStat.findUnique({
    where: {
      userId_cardId: { userId, cardId },
    },
  });

  if (!existing) {
    await tx.userCardStat.create({
      data: {
        userId,
        cardId,
        timesPlayed: 1,
        timesWon: won ? 1 : 0,
        averageAttempts: won ? new Prisma.Decimal(attempts.toFixed(2)) : null,
        averageTimeMs: won ? new Prisma.Decimal(durationMs.toFixed(0)) : null,
      },
    });
    return;
  }

  const timesPlayed = existing.timesPlayed + 1;
  const timesWon = existing.timesWon + (won ? 1 : 0);
  let averageAttempts = existing.averageAttempts;
  let averageTimeMs = existing.averageTimeMs;

  if (won) {
    const prevWinCount = existing.timesWon;
    const nextAvgAttempts =
      prevWinCount === 0 || averageAttempts == null
        ? attempts
        : (Number(averageAttempts) * prevWinCount + attempts) / (prevWinCount + 1);
    averageAttempts = new Prisma.Decimal(nextAvgAttempts.toFixed(2));

    const nextAvgTime =
      prevWinCount === 0 || averageTimeMs == null
        ? durationMs
        : (Number(averageTimeMs) * prevWinCount + durationMs) / (prevWinCount + 1);
    averageTimeMs = new Prisma.Decimal(nextAvgTime.toFixed(0));
  }

  await tx.userCardStat.update({
    where: { userId_cardId: { userId, cardId } },
    data: {
      timesPlayed,
      timesWon,
      averageAttempts,
      averageTimeMs,
    },
  });
}

export async function mergeUserCardStatsAfterGame(
  args: UserCardStatMergeArgs,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await mergeUserCardStatsAfterGameInTx(tx, args);
  });
}

export async function ensureUserStatRowInTx(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.userStat.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function ensureUserStatRow(userId: string): Promise<void> {
  await prisma.userStat.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export type GameOutcomeForStats = {
  userId: string;
  won: boolean;
  /** Winning attempt count; omit on loss. */
  attemptsToWin?: number | null;
  /** Total time to win in ms; omit on loss. */
  timeToWinMs?: number | null;
  /** Typically `Game.finishedAt` — drives `UserStat.lastPlayedAt`. */
  lastPlayedAt?: Date | null;
};

/**
 * Global user stats: `averageAttemptsToWin` / bests use **wins only**; losses still increment gamesPlayed/gamesLost.
 */
export async function applyGameOutcomeToUserStatsInTx(
  tx: Prisma.TransactionClient,
  outcome: GameOutcomeForStats,
): Promise<void> {
  await ensureUserStatRowInTx(tx, outcome.userId);

  const current = await tx.userStat.findUniqueOrThrow({
    where: { userId: outcome.userId },
  });

  const gamesPlayed = current.gamesPlayed + 1;
  const gamesWon = current.gamesWon + (outcome.won ? 1 : 0);
  const gamesLost = current.gamesLost + (outcome.won ? 0 : 1);

  let averageAttemptsToWin: Prisma.Decimal | null = current.averageAttemptsToWin;
  let bestAttemptsRecord = current.bestAttemptsRecord;
  let bestTimeRecordMs = current.bestTimeRecordMs;

  if (outcome.won && outcome.attemptsToWin != null) {
    const prevAvg = current.averageAttemptsToWin;
    const prevWins = current.gamesWon;
    const newAvg =
      prevAvg == null || prevWins === 0
        ? outcome.attemptsToWin
        : (Number(prevAvg) * prevWins + outcome.attemptsToWin) / (prevWins + 1);
    averageAttemptsToWin = new Prisma.Decimal(newAvg.toFixed(2));

    if (
      bestAttemptsRecord == null ||
      outcome.attemptsToWin < bestAttemptsRecord
    ) {
      bestAttemptsRecord = outcome.attemptsToWin;
    }
  }

  if (outcome.won && outcome.timeToWinMs != null) {
    if (
      bestTimeRecordMs == null ||
      outcome.timeToWinMs < bestTimeRecordMs
    ) {
      bestTimeRecordMs = outcome.timeToWinMs;
    }
  }

  const lastPlayedAt = outcome.lastPlayedAt ?? new Date();

  await tx.userStat.update({
    where: { userId: outcome.userId },
    data: {
      gamesPlayed,
      gamesWon,
      gamesLost,
      averageAttemptsToWin,
      bestAttemptsRecord,
      bestTimeRecordMs,
      lastPlayedAt,
    },
  });
}

export async function applyGameOutcomeToUserStats(
  outcome: GameOutcomeForStats,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await applyGameOutcomeToUserStatsInTx(tx, outcome);
  });
}
