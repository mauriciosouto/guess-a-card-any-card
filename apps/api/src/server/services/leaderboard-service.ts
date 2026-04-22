import { Prisma, GameMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const LEADERBOARD_MIN_GAMES_FOR_WIN_RATE = 10;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const MODE_FILTER_SET = new Set<string>(["ALL", ...Object.values(GameMode)]);

export type LeaderboardMetric = "wins" | "winRate";

export type LeaderboardMode = "ALL" | GameMode;

export type GetLeaderboardParams = {
  metric: LeaderboardMetric;
  mode: LeaderboardMode;
  limit: number;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  /** 0–1, derived as gamesWon / gamesPlayed when gamesPlayed &gt; 0. */
  winRate: number;
  lastPlayedAt: string | null;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  currentUserNotQualifiedReason: string | null;
};

type LeaderboardRow = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  lastPlayedAt: Date | null;
};

type AggRow = {
  userId: string;
  gamesPlayed: bigint;
  gamesWon: bigint;
  gamesLost: bigint;
  lastPlayedAt: Date | null;
};

function clampLimit(n: number): number {
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

export function parseLeaderboardQuery(raw: {
  metric?: string;
  mode?: string;
  limit?: string;
}): { ok: true; value: GetLeaderboardParams } | { ok: false; error: string } {
  const metric = raw.metric?.trim() ?? "wins";
  if (metric !== "wins" && metric !== "winRate") {
    return { ok: false, error: "metric must be wins or winRate" };
  }

  const modeStr = (raw.mode?.trim() ?? "ALL") as string;
  if (!MODE_FILTER_SET.has(modeStr)) {
    return { ok: false, error: "mode must be ALL, SINGLE, CHALLENGE, COOP, or COMPETITIVE" };
  }
  const mode: LeaderboardMode = modeStr === "ALL" ? "ALL" : (modeStr as GameMode);

  const limit = clampLimit(Number.parseInt(raw.limit ?? "", 10));

  return { ok: true, value: { metric, mode, limit } };
}

function winRate(played: number, won: number): number {
  if (played <= 0) {
    return 0;
  }
  return won / played;
}

function entryFromRow(
  r: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    lastPlayedAt: Date | null;
  },
  rank: number,
): LeaderboardEntry {
  return {
    rank,
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    gamesPlayed: r.gamesPlayed,
    gamesWon: r.gamesWon,
    gamesLost: r.gamesLost,
    winRate: winRate(r.gamesPlayed, r.gamesWon),
    lastPlayedAt: r.lastPlayedAt?.toISOString() ?? null,
  };
}

function entriesFromRows(rows: LeaderboardRow[], limit: number): LeaderboardEntry[] {
  return rows.slice(0, limit).map((r, i) => entryFromRow(r, i + 1));
}

/** Full sorted row list for “ALL” (UserStat), same order as leaderboard ordering rules. */
async function getSortedRowsFromUserStats(
  params: GetLeaderboardParams,
): Promise<LeaderboardRow[]> {
  if (params.metric === "wins") {
    const dbRows = await prisma.userStat.findMany({
      where: { gamesPlayed: { gt: 0 } },
      orderBy: [{ gamesWon: "desc" }, { gamesPlayed: "desc" }],
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return dbRows.map((r) => ({
      userId: r.user.id,
      displayName: r.user.displayName,
      avatarUrl: r.user.avatarUrl,
      gamesPlayed: r.gamesPlayed,
      gamesWon: r.gamesWon,
      gamesLost: r.gamesLost,
      lastPlayedAt: r.lastPlayedAt,
    }));
  }

  const dbRows = await prisma.userStat.findMany({
    where: { gamesPlayed: { gte: LEADERBOARD_MIN_GAMES_FOR_WIN_RATE } },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return dbRows
    .map((r) => ({
      userId: r.user.id,
      displayName: r.user.displayName,
      avatarUrl: r.user.avatarUrl,
      gamesPlayed: r.gamesPlayed,
      gamesWon: r.gamesWon,
      gamesLost: r.gamesLost,
      lastPlayedAt: r.lastPlayedAt,
      wr: winRate(r.gamesPlayed, r.gamesWon),
    }))
    .sort((a, b) => {
      if (b.wr !== a.wr) {
        return b.wr - a.wr;
      }
      return b.gamesPlayed - a.gamesPlayed;
    })
    .map(({ wr: _w, ...r }) => r);
}

/** Per-mode rollups, full sort (same as previous implementation). */
async function getSortedRowsFromGameAggregates(
  mode: GameMode,
  params: GetLeaderboardParams,
): Promise<LeaderboardRow[]> {
  const rows = await prisma.$queryRaw<AggRow[]>(Prisma.sql`
    SELECT
      gp.user_id AS "userId",
      COUNT(*)::bigint AS "gamesPlayed",
      COUNT(*) FILTER (WHERE gp.did_win)::bigint AS "gamesWon",
      COUNT(*) FILTER (WHERE NOT gp.did_win)::bigint AS "gamesLost",
      MAX(COALESCE(g.finished_at, g.started_at)) AS "lastPlayedAt"
    FROM game_players gp
    INNER JOIN games g ON g.id = gp.game_id
    WHERE
      gp.user_id IS NOT NULL
      AND g.mode = ${mode}::"GameMode"
      AND g.status IN (
        'WON'::"GameStatus",
        'LOST'::"GameStatus",
        'CANCELLED'::"GameStatus"
      )
    GROUP BY gp.user_id
    HAVING COUNT(*) > 0
  `);

  const userIds = rows.map((r) => r.userId);
  if (userIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, avatarUrl: true },
  });
  const byId = new Map(users.map((u) => [u.id, u] as const));

  const withProfile = rows
    .map((r) => {
      const u = byId.get(r.userId);
      if (!u) {
        return null;
      }
      return {
        userId: r.userId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        gamesPlayed: Number(r.gamesPlayed),
        gamesWon: Number(r.gamesWon),
        gamesLost: Number(r.gamesLost),
        lastPlayedAt: r.lastPlayedAt,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (params.metric === "wins") {
    return withProfile
      .filter((r) => r.gamesPlayed > 0)
      .sort((a, b) => {
        if (b.gamesWon !== a.gamesWon) {
          return b.gamesWon - a.gamesWon;
        }
        return b.gamesPlayed - a.gamesPlayed;
      });
  }

  return withProfile
    .filter((r) => r.gamesPlayed >= LEADERBOARD_MIN_GAMES_FOR_WIN_RATE)
    .map((r) => ({ ...r, wr: winRate(r.gamesPlayed, r.gamesWon) }))
    .sort((a, b) => {
      if (b.wr !== a.wr) {
        return b.wr - a.wr;
      }
      return b.gamesPlayed - a.gamesPlayed;
    })
    .map(({ wr: _w, ...r }) => r);
}

async function getScopeSnapshot(
  userId: string,
  mode: LeaderboardMode,
): Promise<LeaderboardRow | null> {
  if (mode === "ALL") {
    const s = await prisma.userStat.findUnique({
      where: { userId },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    if (!s) {
      return null;
    }
    return {
      userId: s.user.id,
      displayName: s.user.displayName,
      avatarUrl: s.user.avatarUrl,
      gamesPlayed: s.gamesPlayed,
      gamesWon: s.gamesWon,
      gamesLost: s.gamesLost,
      lastPlayedAt: s.lastPlayedAt,
    };
  }

  const one = await prisma.$queryRaw<AggRow[]>(Prisma.sql`
    SELECT
      gp.user_id AS "userId",
      COUNT(*)::bigint AS "gamesPlayed",
      COUNT(*) FILTER (WHERE gp.did_win)::bigint AS "gamesWon",
      COUNT(*) FILTER (WHERE NOT gp.did_win)::bigint AS "gamesLost",
      MAX(COALESCE(g.finished_at, g.started_at)) AS "lastPlayedAt"
    FROM game_players gp
    INNER JOIN games g ON g.id = gp.game_id
    WHERE
      gp.user_id = ${userId}::uuid
      AND g.mode = ${mode}::"GameMode"
      AND g.status IN (
        'WON'::"GameStatus",
        'LOST'::"GameStatus",
        'CANCELLED'::"GameStatus"
      )
    GROUP BY gp.user_id
  `);
  if (one.length === 0) {
    return null;
  }
  const r = one[0]!;
  const u = await prisma.user.findUnique({
    where: { id: r.userId },
    select: { id: true, displayName: true, avatarUrl: true },
  });
  if (!u) {
    return null;
  }
  return {
    userId: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    gamesPlayed: Number(r.gamesPlayed),
    gamesWon: Number(r.gamesWon),
    gamesLost: Number(r.gamesLost),
    lastPlayedAt: r.lastPlayedAt,
  };
}

function notQualifiedReason(
  params: GetLeaderboardParams,
  scope: LeaderboardRow | null,
): string {
  const played = scope?.gamesPlayed ?? 0;
  if (params.metric === "winRate" && played < LEADERBOARD_MIN_GAMES_FOR_WIN_RATE) {
    return `Win rate ranking requires at least ${LEADERBOARD_MIN_GAMES_FOR_WIN_RATE} games in this scope. You have ${played} so far.`;
  }
  if (params.metric === "wins" && played === 0) {
    return "This leaderboard lists players with at least one completed game in this scope. You have not completed any yet.";
  }
  return "You are not ranked for the selected filters.";
}

async function getSortedRows(params: GetLeaderboardParams): Promise<LeaderboardRow[]> {
  if (params.mode === "ALL") {
    return getSortedRowsFromUserStats(params);
  }
  return getSortedRowsFromGameAggregates(params.mode, params);
}

/**
 * Public leaderboard: registered users only. Optional `currentUserId` adds rank in the full list
 * (not only top N) and qualification messaging.
 */
export async function getLeaderboard(
  input: GetLeaderboardParams,
  options?: { currentUserId: string | null },
): Promise<LeaderboardResponse> {
  const fullRows = await getSortedRows(input);
  const entries = entriesFromRows(fullRows, input.limit);

  const currentUserId = options?.currentUserId;
  if (!currentUserId) {
    return {
      entries,
      currentUserEntry: null,
      currentUserNotQualifiedReason: null,
    };
  }

  const idx = fullRows.findIndex((r) => r.userId === currentUserId);
  if (idx >= 0) {
    return {
      entries,
      currentUserEntry: entryFromRow(fullRows[idx]!, idx + 1),
      currentUserNotQualifiedReason: null,
    };
  }

  const scope = await getScopeSnapshot(currentUserId, input.mode);
  return {
    entries,
    currentUserEntry: null,
    currentUserNotQualifiedReason: notQualifiedReason(input, scope),
  };
}
