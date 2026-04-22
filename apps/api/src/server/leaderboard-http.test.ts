import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getLeaderboard = vi.hoisted(() => vi.fn());
const tryResolveUserIdFromRequest = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/leaderboard-service", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/server/services/leaderboard-service")>();
  return { ...mod, getLeaderboard };
});

vi.mock("@/server/auth/resolve-actor", () => ({
  tryResolveUserIdFromRequest,
}));

import { leaderboardRoutes } from "@/server/leaderboard-routes";

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    getLeaderboard.mockReset();
    tryResolveUserIdFromRequest.mockReset();
    tryResolveUserIdFromRequest.mockResolvedValue(null);
  });

  it("returns 400 for invalid metric", async () => {
    const app = new Hono().basePath("/api").route("/leaderboard", leaderboardRoutes);
    const res = await app.request("http://localhost/api/leaderboard?metric=bad");
    expect(res.status).toBe(400);
  });

  it("passes null current user when unauthenticated and returns body", async () => {
    getLeaderboard.mockResolvedValue({
      entries: [
        {
          rank: 1,
          userId: "11111111-1111-4111-8111-111111111111",
          displayName: "One",
          avatarUrl: null,
          gamesPlayed: 12,
          gamesWon: 6,
          gamesLost: 6,
          winRate: 0.5,
          lastPlayedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      currentUserEntry: null,
      currentUserNotQualifiedReason: null,
    });

    const app = new Hono().basePath("/api").route("/leaderboard", leaderboardRoutes);
    const res = await app.request(
      "http://localhost/api/leaderboard?metric=winRate&mode=CHALLENGE&limit=20",
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      entries: { userId: string }[];
      currentUserEntry: null;
    };
    expect(j.entries).toHaveLength(1);
    expect(j.entries[0]!.userId).toBe("11111111-1111-4111-8111-111111111111");
    expect(tryResolveUserIdFromRequest).toHaveBeenCalled();
    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: "winRate",
        mode: "CHALLENGE",
        limit: 20,
      }),
      { currentUserId: null },
    );
  });

  it("passes current user id when Authorization resolves", async () => {
    const uid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    tryResolveUserIdFromRequest.mockResolvedValue(uid);
    getLeaderboard.mockResolvedValue({
      entries: [],
      currentUserEntry: null,
      currentUserNotQualifiedReason: "test reason",
    });

    const app = new Hono().basePath("/api").route("/leaderboard", leaderboardRoutes);
    const res = await app.request("http://localhost/api/leaderboard", {
      headers: { authorization: "Bearer t" },
    });
    expect(res.status).toBe(200);
    const j = (await res.json()) as { currentUserNotQualifiedReason: string | null };
    expect(j.currentUserNotQualifiedReason).toBe("test reason");
    expect(getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ metric: "wins", mode: "ALL" }),
      { currentUserId: uid },
    );
  });
});
