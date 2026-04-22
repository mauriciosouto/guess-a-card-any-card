import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPublicProfileByUserId = vi.hoisted(() => vi.fn());
const requireUserActor = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    kind: "user" as const,
    userId: "11111111-1111-4111-8111-111111111111",
  }),
);

vi.mock("@/server/services/profile-service", () => ({
  getPublicProfileByUserId,
}));

vi.mock("@/server/auth/resolve-actor", () => ({
  requireUserActor,
}));

import { profileRoutes } from "@/server/profile-routes";

describe("profile HTTP routes", () => {
  beforeEach(() => {
    getPublicProfileByUserId.mockReset();
    requireUserActor.mockReset();
    requireUserActor.mockResolvedValue({
      kind: "user",
      userId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("GET /api/profile/:userId returns JSON when user exists", async () => {
    getPublicProfileByUserId.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      displayName: "Test",
      avatarUrl: null,
      memberSince: new Date().toISOString(),
      bio: null,
      stats: {
        gamesPlayed: 1,
        gamesWon: 1,
        gamesLost: 0,
        averageAttemptsToWin: "3.00",
        bestAttemptsRecord: 3,
        bestTimeRecordMs: 1000,
        lastPlayedAt: null,
      },
      recentGames: [],
      recentChallengesHosted: [],
    });

    const app = new Hono().basePath("/api").route("/profile", profileRoutes);
    const res = await app.request(
      "http://localhost/api/profile/22222222-2222-4222-8222-222222222222",
    );
    expect(res.status).toBe(200);
    const j = (await res.json()) as { displayName: string; stats: { gamesPlayed: number } };
    expect(j.displayName).toBe("Test");
    expect(j.stats.gamesPlayed).toBe(1);
    expect(getPublicProfileByUserId).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      { includeEmail: false },
    );
  });

  it("GET /api/profile/me requires requireUserActor", async () => {
    getPublicProfileByUserId.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      displayName: "Me",
      avatarUrl: null,
      memberSince: new Date().toISOString(),
      email: "a@b.co",
      bio: null,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        averageAttemptsToWin: null,
        bestAttemptsRecord: null,
        bestTimeRecordMs: null,
        lastPlayedAt: null,
      },
      recentGames: [],
      recentChallengesHosted: [],
    });

    const app = new Hono().basePath("/api").route("/profile", profileRoutes);
    const res = await app.request("http://localhost/api/profile/me");
    expect(res.status).toBe(200);
    const j = (await res.json()) as { email?: string };
    expect(j.email).toBe("a@b.co");
    expect(requireUserActor).toHaveBeenCalled();
  });
});
