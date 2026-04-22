import {
  ChallengeStatus,
  GameMode,
  GameStatus,
} from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gamePlayerRows: Array<{
  userId: string | null;
  guestId: string | null;
}> = [];

const tx = vi.hoisted(() => ({
  challenge: {
    findUnique: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  game: {
    create: vi.fn().mockResolvedValue({ id: "new-game-id" }),
  },
  gamePlayer: {
    create: vi.fn(async ({ data }: { data: { userId: string | null; guestId: string | null } }) => {
      gamePlayerRows.push({ userId: data.userId, guestId: data.guestId });
      return data;
    }),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (t: typeof tx) => Promise<string>) => fn(tx),
  },
}));

vi.mock("@/lib/game-player-display-name", () => ({
  resolveGamePlayerDisplayNameForSession: vi.fn().mockResolvedValue("Challenger"),
  DisplayNameResolutionError: class extends Error {},
}));

describe("startChallenge GamePlayer ownership", () => {
  beforeEach(() => {
    gamePlayerRows.length = 0;
    vi.mocked(tx.challenge.findUnique).mockResolvedValue({
      id: "chal-1",
      status: ChallengeStatus.PENDING,
      gameId: null,
      cardId: "c1",
      cardName: "Card",
      cardSet: "MON",
      cardImageUrl: "https://example.com/c.png",
      revealSeed: "seed",
      revealCardKind: "hero",
      cardTemplateKey: "hero",
      createdByUserId: null,
      createdByGuestId: "host-guest",
      outcome: null,
      startedAt: null,
      completedAt: null,
      attemptsUsed: null,
      timeMs: null,
      finalGuess: null,
      createdAt: new Date(),
    });
  });

  it("persists challenger userId only for authenticated player", async () => {
    const { startChallenge } = await import("@/server/services/challenge-service");
    const uid = "22222222-2222-4222-8222-222222222222";
    await startChallenge({
      challengeId: "chal-1",
      playerIdentity: { userId: uid, guestId: null },
    });
    expect(gamePlayerRows).toHaveLength(1);
    expect(gamePlayerRows[0]).toEqual({ userId: uid, guestId: null });
    expect(tx.game.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: GameMode.CHALLENGE,
          status: GameStatus.IN_PROGRESS,
        }),
      }),
    );
  });

  it("persists challenger guestId only for guest player", async () => {
    const { startChallenge } = await import("@/server/services/challenge-service");
    await startChallenge({
      challengeId: "chal-1",
      playerIdentity: { userId: null, guestId: "player-guest-abc" },
    });
    expect(gamePlayerRows).toHaveLength(1);
    expect(gamePlayerRows[0]).toEqual({ userId: null, guestId: "player-guest-abc" });
  });

  it("rejects player identity with both user and guest", async () => {
    const { startChallenge } = await import("@/server/services/challenge-service");
    await expect(
      startChallenge({
        challengeId: "chal-1",
        playerIdentity: {
          userId: "22222222-2222-4222-8222-222222222222",
          guestId: "bad",
        },
      }),
    ).rejects.toMatchObject({ name: "ChallengeHttpError", status: 400 });
    expect(gamePlayerRows).toHaveLength(0);
  });
});
