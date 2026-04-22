/** Mirrors `GET /api/profile/*` JSON (v1). */
export type PublicProfileStats = {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  averageAttemptsToWin: string | null;
  bestAttemptsRecord: number | null;
  bestTimeRecordMs: number | null;
  lastPlayedAt: string | null;
};

export type ProfileRecentGame = {
  gameId: string;
  mode: string;
  status: string;
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
