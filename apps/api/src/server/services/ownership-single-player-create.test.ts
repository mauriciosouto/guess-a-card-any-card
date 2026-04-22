import { Type, type Printing } from "@flesh-and-blood/types";
import { GameMode, GameStatus } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const card = {
  id: "single-ownership-card-1",
  name: "Test Card",
  setKey: "MON",
  fabCard: { types: [Type.Hero] },
  imageUrl: "key.width-450",
  printing: {} as Printing,
};

vi.mock("@/server/services/card-catalog-service", () => ({
  getRandomCard: vi.fn(() => card),
  getCatalogCardById: vi.fn(() => card),
}));

vi.mock("@/lib/game-player-display-name", () => ({
  resolveGamePlayerDisplayNameForSession: vi.fn(async (identity: { userId: string | null }) => {
    if (identity.userId) {
      return "Signed-in player";
    }
    return "Guest player";
  }),
  DisplayNameResolutionError: class extends Error {},
}));

let lastGamePlayerPayload: {
  userId: string | null;
  guestId: string | null;
  displayName: string;
} | null = null;

const tx = vi.hoisted(() => {
  const gid = "game-single-own-1";
  return {
    game: {
      create: vi.fn().mockResolvedValue({ id: gid }),
    },
    gamePlayer: {
      create: vi.fn(
        async ({
          data,
        }: {
          data: {
            userId: string | null;
            guestId: string | null;
            displayName: string;
          };
        }) => {
          lastGamePlayerPayload = data;
          return data;
        },
      ),
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (t: typeof tx) => Promise<string>) => fn(tx),
    game: {
      findUnique: vi.fn().mockImplementation(() => ({
        id: "game-single-own-1",
        roomId: null,
        mode: GameMode.SINGLE,
        cardId: card.id,
        cardName: card.name,
        cardSet: card.setKey,
        cardImageUrl: "https://example.com/art.png",
        revealSeed: "seed-fixed",
        revealCardKind: "hero",
        cardTemplateKey: "hero",
        status: GameStatus.IN_PROGRESS,
        currentStep: 1,
        activeTurnRoomPlayerId: null,
        startedAt: new Date(),
        finishedAt: null,
        winnerUserId: null,
        winnerGuestId: null,
        winningAttemptCount: null,
        winningTotalTimeMs: null,
        createdAt: new Date(),
        competitiveStepDeadlineAt: null,
        guesses: [],
        gamePlayers: [
          {
            id: "gp-1",
            gameId: "game-single-own-1",
            roomPlayerId: null,
            userId: lastGamePlayerPayload?.userId ?? null,
            guestId: lastGamePlayerPayload?.guestId ?? null,
            displayName: lastGamePlayerPayload?.displayName ?? "",
            avatarId: null,
            finalRank: null,
            solvedAtStep: null,
            solvedTotalTimeMs: null,
            didWin: false,
            createdAt: new Date(),
            competitiveState: null,
          },
        ],
      })),
    },
  },
}));

describe("startSinglePlayerGame ownership persistence", () => {
  beforeEach(() => {
    lastGamePlayerPayload = null;
  });

  it("persists guest GamePlayer with guestId only", async () => {
    const { startSinglePlayerGame } = await import("@/server/services/single-player-service");
    await startSinglePlayerGame({
      selectedFabSets: [],
      identity: { userId: null, guestId: "guest-single-xyz" },
    });
    expect(lastGamePlayerPayload).not.toBeNull();
    expect(lastGamePlayerPayload!.userId).toBeNull();
    expect(lastGamePlayerPayload!.guestId).toBe("guest-single-xyz");
  });

  it("persists user GamePlayer with userId only", async () => {
    const { startSinglePlayerGame } = await import("@/server/services/single-player-service");
    const uid = "33333333-3333-4333-8333-333333333333";
    await startSinglePlayerGame({
      selectedFabSets: [],
      identity: { userId: uid, guestId: null },
    });
    expect(lastGamePlayerPayload).not.toBeNull();
    expect(lastGamePlayerPayload!.userId).toBe(uid);
    expect(lastGamePlayerPayload!.guestId).toBeNull();
  });
});
