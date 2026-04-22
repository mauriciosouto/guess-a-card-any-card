export type LeaderboardMetric = "wins" | "winRate";

/** Must match `GET /api/leaderboard` query `mode` values. */
export type LeaderboardMode =
  | "ALL"
  | "SINGLE"
  | "CHALLENGE"
  | "COOP"
  | "COMPETITIVE";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  lastPlayedAt: string | null;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  currentUserNotQualifiedReason: string | null;
};
