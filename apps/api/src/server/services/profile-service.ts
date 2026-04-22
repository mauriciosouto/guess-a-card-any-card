import { GameMode, GameStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidProfileUserId(id: string): boolean {
  return UUID_RE.test(id);
}

export type PublicProfileStats = {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  /** Decimal string, e.g. "12.50", or null when no wins yet. */
  averageAttemptsToWin: string | null;
  bestAttemptsRecord: number | null;
  bestTimeRecordMs: number | null;
  lastPlayedAt: string | null;
};

export type ProfileRecentGame = {
  gameId: string;
  mode: GameMode;
  status: GameStatus;
  cardId: string;
  cardName: string;
  didWin: boolean;
  finishedAt: string | null;
};

export type ProfileRecentChallengeHosted = {
  challengeId: string;
  status: string;
  cardName: string;
  cardId: string;
  outcome: string | null;
  createdAt: string;
};

export type PublicProfileResponse = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  memberSince: string;
  email?: string | null;
  bio: string | null;
  stats: PublicProfileStats;
  recentGames: ProfileRecentGame[];
  recentChallengesHosted: ProfileRecentChallengeHosted[];
};

function emptyStats(): PublicProfileStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    averageAttemptsToWin: null,
    bestAttemptsRecord: null,
    bestTimeRecordMs: null,
    lastPlayedAt: null,
  };
}

function statsFromRow(
  row: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    averageAttemptsToWin: Prisma.Decimal | null;
    bestAttemptsRecord: number | null;
    bestTimeRecordMs: number | null;
    lastPlayedAt: Date | null;
  } | null,
): PublicProfileStats {
  if (!row) {
    return emptyStats();
  }
  return {
    gamesPlayed: row.gamesPlayed,
    gamesWon: row.gamesWon,
    gamesLost: row.gamesLost,
    averageAttemptsToWin:
      row.averageAttemptsToWin != null
        ? String(row.averageAttemptsToWin)
        : null,
    bestAttemptsRecord: row.bestAttemptsRecord,
    bestTimeRecordMs: row.bestTimeRecordMs,
    lastPlayedAt: row.lastPlayedAt?.toISOString() ?? null,
  };
}

const terminalGameStatuses: GameStatus[] = [
  GameStatus.WON,
  GameStatus.LOST,
  GameStatus.CANCELLED,
];

export async function getPublicProfileByUserId(
  userId: string,
  options: { includeEmail: boolean },
): Promise<PublicProfileResponse | null> {
  if (!isValidProfileUserId(userId)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      userStats: true,
    },
  });

  if (!user) {
    return null;
  }

  const [recentGameRows, hostedChallenges] = await Promise.all([
    prisma.game.findMany({
      where: {
        status: { in: terminalGameStatuses },
        finishedAt: { not: null },
        gamePlayers: { some: { userId } },
      },
      orderBy: { finishedAt: "desc" },
      take: 12,
      include: {
        gamePlayers: { where: { userId } },
      },
    }),
    prisma.challenge.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        cardName: true,
        cardId: true,
        outcome: true,
        createdAt: true,
      },
    }),
  ]);

  const recentGames: ProfileRecentGame[] = recentGameRows.map((g) => {
    const gp = g.gamePlayers[0];
    return {
      gameId: g.id,
      mode: g.mode,
      status: g.status,
      cardId: g.cardId,
      cardName: g.cardName,
      didWin: gp?.didWin ?? false,
      finishedAt: g.finishedAt?.toISOString() ?? null,
    };
  });

  const recentChallengesHosted: ProfileRecentChallengeHosted[] = hostedChallenges.map(
    (c) => ({
      challengeId: c.id,
      status: c.status,
      cardName: c.cardName,
      cardId: c.cardId,
      outcome: c.outcome,
      createdAt: c.createdAt.toISOString(),
    }),
  );

  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    memberSince: user.createdAt.toISOString(),
    ...(options.includeEmail ? { email: user.email } : {}),
    bio: user.profile?.bio ?? null,
    stats: statsFromRow(user.userStats),
    recentGames,
    recentChallengesHosted,
  };
}
