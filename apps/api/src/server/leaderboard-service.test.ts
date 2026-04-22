import { GameMode } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userStatFindMany = vi.fn();
const userStatFindUnique = vi.fn();
const userFindMany = vi.fn();
const userFindUnique = vi.fn();
const queryRaw = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userStat: { findMany: userStatFindMany, findUnique: userStatFindUnique },
    user: { findMany: userFindMany, findUnique: userFindUnique },
    $queryRaw: queryRaw,
  },
}));

describe("parseLeaderboardQuery", () => {
  it("defaults to wins, ALL, limit 50", async () => {
    const { parseLeaderboardQuery } = await import("@/server/services/leaderboard-service");
    const r = parseLeaderboardQuery({});
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.metric).toBe("wins");
    expect(r.value.mode).toBe("ALL");
    expect(r.value.limit).toBe(50);
  });

  it("rejects invalid metric", async () => {
    const { parseLeaderboardQuery } = await import("@/server/services/leaderboard-service");
    const r = parseLeaderboardQuery({ metric: "foo" });
    expect(r.ok).toBe(false);
  });

  it("accepts each game mode", async () => {
    const { parseLeaderboardQuery } = await import("@/server/services/leaderboard-service");
    for (const m of ["SINGLE", "CHALLENGE", "COOP", "COMPETITIVE"] as const) {
      const r = parseLeaderboardQuery({ mode: m });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.mode).toBe(m);
    }
  });
});

const sampleUsersAllWins = [
  {
    gamesPlayed: 10,
    gamesWon: 2,
    gamesLost: 8,
    lastPlayedAt: new Date("2026-01-02T00:00:00.000Z"),
    user: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      displayName: "B",
      avatarUrl: "https://x/a.png",
    },
  },
  {
    gamesPlayed: 5,
    gamesWon: 2,
    gamesLost: 3,
    lastPlayedAt: new Date("2026-01-01T00:00:00.000Z"),
    user: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      displayName: "A",
      avatarUrl: null,
    },
  },
  {
    gamesPlayed: 1,
    gamesWon: 0,
    gamesLost: 1,
    lastPlayedAt: new Date("2026-01-03T00:00:00.000Z"),
    user: {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      displayName: "C",
      avatarUrl: null,
    },
  },
];

describe("getLeaderboard", () => {
  beforeEach(() => {
    userStatFindMany.mockReset();
    userStatFindUnique.mockReset();
    userFindMany.mockReset();
    userFindUnique.mockReset();
    queryRaw.mockReset();
  });

  it("ALL + wins: full list ordered, entries slice, no take in query", async () => {
    userStatFindMany.mockResolvedValue([...sampleUsersAllWins]);

    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const out = await getLeaderboard({ metric: "wins", mode: "ALL", limit: 2 });

    expect(userStatFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gamesPlayed: { gt: 0 } },
        orderBy: [{ gamesWon: "desc" }, { gamesPlayed: "desc" }],
      }),
    );
    const called = userStatFindMany.mock.calls[0]![0] as { take?: number };
    expect(called.take).toBeUndefined();

    expect(out.entries).toHaveLength(2);
    expect(out.entries[0]!.rank).toBe(1);
    expect(out.entries[0]!.userId).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(out.entries[0]!.winRate).toBeCloseTo(0.2);
    expect(out.entries[1]!.userId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(out.currentUserEntry).toBeNull();
    expect(out.currentUserNotQualifiedReason).toBeNull();
  });

  it("current user in top 50: currentUserEntry matches list rank and tie-breaks", async () => {
    userStatFindMany.mockResolvedValue([...sampleUsersAllWins]);
    const me = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const out = await getLeaderboard(
      { metric: "wins", mode: "ALL", limit: 2 },
      { currentUserId: me },
    );

    expect(out.entries[0]!.userId).toBe(me);
    expect(out.currentUserEntry).not.toBeNull();
    expect(out.currentUserEntry!.rank).toBe(1);
    expect(out.currentUserNotQualifiedReason).toBeNull();
  });

  it("current user outside top 50: rank in full list, not in entries", async () => {
    userStatFindMany.mockResolvedValue([...sampleUsersAllWins]);
    const me = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const out = await getLeaderboard(
      { metric: "wins", mode: "ALL", limit: 2 },
      { currentUserId: me },
    );

    expect(out.entries).toHaveLength(2);
    expect(out.entries.some((e) => e.userId === me)).toBe(false);
    expect(out.currentUserEntry).not.toBeNull();
    expect(out.currentUserEntry!.rank).toBe(3);
    expect(out.currentUserNotQualifiedReason).toBeNull();
  });

  it("unauthenticated path: no current user fields (null)", async () => {
    userStatFindMany.mockResolvedValue([sampleUsersAllWins[0]!]);
    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const out = await getLeaderboard({ metric: "wins", mode: "ALL", limit: 10 });
    expect(out.currentUserEntry).toBeNull();
    expect(out.currentUserNotQualifiedReason).toBeNull();
  });

  it("winRate: not qualified when fewer than 10 games", async () => {
    userStatFindMany.mockResolvedValue([
      {
        gamesPlayed: 10,
        gamesWon: 5,
        gamesLost: 5,
        lastPlayedAt: new Date("2026-01-01T00:00:00.000Z"),
        user: {
          id: "a1111111-1111-4111-8111-111111111111",
          displayName: "High",
          avatarUrl: null,
        },
      },
    ]);
    userStatFindUnique.mockResolvedValue({
      gamesPlayed: 4,
      gamesWon: 1,
      gamesLost: 3,
      lastPlayedAt: new Date("2026-01-01T00:00:00.000Z"),
      user: {
        id: "b2222222-2222-4222-8222-222222222222",
        displayName: "Short",
        avatarUrl: null,
      },
    });

    const { getLeaderboard, LEADERBOARD_MIN_GAMES_FOR_WIN_RATE } = await import(
      "@/server/services/leaderboard-service"
    );
    const out = await getLeaderboard(
      { metric: "winRate", mode: "ALL", limit: 10 },
      { currentUserId: "b2222222-2222-4222-8222-222222222222" },
    );

    expect(out.currentUserEntry).toBeNull();
    expect(out.currentUserNotQualifiedReason).toContain(
      `${LEADERBOARD_MIN_GAMES_FOR_WIN_RATE} games`,
    );
    expect(out.currentUserNotQualifiedReason).toContain("4");
  });

  it("ALL + winRate: requires at least 10 games and sorts by win rate", async () => {
    userStatFindMany.mockResolvedValue([
      {
        gamesPlayed: 10,
        gamesWon: 5,
        gamesLost: 5,
        lastPlayedAt: new Date("2026-01-01T00:00:00.000Z"),
        user: {
          id: "a1111111-1111-4111-8111-111111111111",
          displayName: "High",
          avatarUrl: null,
        },
      },
      {
        gamesPlayed: 20,
        gamesWon: 8,
        gamesLost: 12,
        lastPlayedAt: new Date("2026-01-02T00:00:00.000Z"),
        user: {
          id: "b2222222-2222-4222-8222-222222222222",
          displayName: "Low",
          avatarUrl: null,
        },
      },
    ]);

    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const out = await getLeaderboard({ metric: "winRate", mode: "ALL", limit: 10 });

    expect(userStatFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gamesPlayed: { gte: 10 } },
      }),
    );
    expect(out.entries[0]!.userId).toBe("a1111111-1111-4111-8111-111111111111");
    expect(out.entries[0]!.winRate).toBeCloseTo(0.5);
    expect(out.entries[1]!.userId).toBe("b2222222-2222-4222-8222-222222222222");
    expect(out.entries[1]!.winRate).toBeCloseTo(0.4);
  });

  it("SINGLE + wins: aggregates from Game+GamePlayer and orders correctly", async () => {
    queryRaw.mockResolvedValueOnce([
      {
        userId: "c1111111-1111-4111-8111-111111111111",
        gamesPlayed: 3n,
        gamesWon: 1n,
        gamesLost: 2n,
        lastPlayedAt: new Date("2026-03-01T00:00:00.000Z"),
      },
      {
        userId: "c2222222-2222-4222-8222-222222222222",
        gamesPlayed: 3n,
        gamesWon: 2n,
        gamesLost: 1n,
        lastPlayedAt: new Date("2026-03-02T00:00:00.000Z"),
      },
    ]);
    userFindMany.mockResolvedValue([
      { id: "c1111111-1111-4111-8111-111111111111", displayName: "x", avatarUrl: null },
      { id: "c2222222-2222-4222-8222-222222222222", displayName: "y", avatarUrl: null },
    ]);

    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const out = await getLeaderboard({ metric: "wins", mode: GameMode.SINGLE, limit: 5 });

    expect(out.entries[0]!.userId).toBe("c2222222-2222-4222-8222-222222222222");
    expect(out.entries[0]!.gamesWon).toBe(2);
    expect(out.entries[1]!.userId).toBe("c1111111-1111-4111-8111-111111111111");
  });

  it("COOP + winRate: only includes users with 10+ games in that mode", async () => {
    queryRaw.mockResolvedValueOnce([
      {
        userId: "d1111111-1111-4111-8111-111111111111",
        gamesPlayed: 9n,
        gamesWon: 8n,
        gamesLost: 1n,
        lastPlayedAt: new Date("2026-04-01T00:00:00.000Z"),
      },
      {
        userId: "d2222222-2222-4222-8222-222222222222",
        gamesPlayed: 10n,
        gamesWon: 5n,
        gamesLost: 5n,
        lastPlayedAt: new Date("2026-04-02T00:00:00.000Z"),
      },
    ]);
    userFindMany.mockResolvedValue([
      { id: "d1111111-1111-4111-8111-111111111111", displayName: "Edge", avatarUrl: null },
      { id: "d2222222-2222-4222-8222-222222222222", displayName: "Ok", avatarUrl: null },
    ]);

    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const out = await getLeaderboard({ metric: "winRate", mode: GameMode.COOP, limit: 10 });
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0]!.userId).toBe("d2222222-2222-4222-8222-222222222222");
  });

  it("mode-specific path uses $queryRaw for list aggregate", async () => {
    queryRaw.mockResolvedValueOnce([]);
    userFindMany.mockResolvedValue([]);

    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    await getLeaderboard({ metric: "wins", mode: GameMode.COMPETITIVE, limit: 5 });

    expect(queryRaw).toHaveBeenCalled();
  });
});

describe("getLeaderboard tie-break (same gamesWon and gamesPlayed)", () => {
  beforeEach(() => {
    userStatFindMany.mockReset();
  });
  it("resolves rank from full list index (stable order from DB for ties)", async () => {
    const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    userStatFindMany.mockResolvedValue([
      {
        gamesPlayed: 3,
        gamesWon: 1,
        gamesLost: 2,
        lastPlayedAt: new Date("2026-01-01T00:00:00.000Z"),
        user: { id: a, displayName: "A1", avatarUrl: null },
      },
      {
        gamesPlayed: 3,
        gamesWon: 1,
        gamesLost: 2,
        lastPlayedAt: new Date("2026-01-01T00:00:00.000Z"),
        user: { id: b, displayName: "A2", avatarUrl: null },
      },
    ]);
    const { getLeaderboard } = await import("@/server/services/leaderboard-service");
    const forB = await getLeaderboard(
      { metric: "wins", mode: "ALL", limit: 1 },
      { currentUserId: b },
    );
    expect(forB.currentUserEntry!.rank).toBe(2);
    const forA = await getLeaderboard(
      { metric: "wins", mode: "ALL", limit: 1 },
      { currentUserId: a },
    );
    expect(forA.currentUserEntry!.rank).toBe(1);
  });
});
