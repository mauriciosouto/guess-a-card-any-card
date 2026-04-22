import { buildGameApiRequestHeaders } from "@/lib/auth/game-api-headers";
import type { LeaderboardMetric, LeaderboardMode, LeaderboardResponse } from "@/lib/leaderboard/types";

export type FetchLeaderboardParams = {
  metric: LeaderboardMetric;
  mode: LeaderboardMode;
  /** default 50 on server */
  limit?: number;
};

export async function fetchLeaderboard(
  params: FetchLeaderboardParams,
): Promise<LeaderboardResponse> {
  const sp = new URLSearchParams();
  sp.set("metric", params.metric);
  sp.set("mode", params.mode);
  if (params.limit != null) {
    sp.set("limit", String(params.limit));
  }
  const headers = await buildGameApiRequestHeaders();
  const res = await fetch(`/api/leaderboard?${sp.toString()}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      typeof j.error === "string" && j.error.length > 0
        ? j.error
        : `Could not load leaderboard (${res.status})`,
    );
  }
  return (await res.json()) as LeaderboardResponse;
}
