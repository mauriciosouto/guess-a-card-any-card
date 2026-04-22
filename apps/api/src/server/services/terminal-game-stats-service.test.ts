import { GameMode, GameStatus } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const applyGameOutcomeToUserStatsInTx = vi.hoisted(() => vi.fn());
const mergeUserCardStatsAfterGameInTx = vi.hoisted(() => vi.fn());

vi.mock("@/server/repositories/stats-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/repositories/stats-repository")>();
  return {
    ...actual,
    applyGameOutcomeToUserStatsInTx,
    mergeUserCardStatsAfterGameInTx,
  };
});

describe("applyRegisteredUserStatsForTerminalGameInTx", () => {
  const gameUpdate = vi.fn();
  const gameFindUnique = vi.fn();

  const tx = {
    game: {
      findUnique: gameFindUnique,
      update: gameUpdate,
    },
  };

  beforeEach(() => {
    applyGameOutcomeToUserStatsInTx.mockClear();
    mergeUserCardStatsAfterGameInTx.mockClear();
    gameUpdate.mockClear();
    gameFindUnique.mockReset();
  });

  it("is a no-op when statsAggregatedAt is already set", async () => {
    const finished = new Date("2026-04-20T12:00:00.000Z");
    gameFindUnique.mockResolvedValue({
      id: "g1",
      mode: GameMode.SINGLE,
      status: GameStatus.WON,
      cardId: "card-1",
      finishedAt: finished,
      statsAggregatedAt: finished,
      gamePlayers: [
        {
          id: "gp1",
          userId: "11111111-1111-4111-8111-111111111111",
          guestId: null,
          didWin: true,
        },
      ],
      guesses: [
        {
          gamePlayerId: "gp1",
          timeTakenMs: 100,
        },
      ],
    });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g1");

    expect(applyGameOutcomeToUserStatsInTx).not.toHaveBeenCalled();
    expect(gameUpdate).not.toHaveBeenCalled();
  });

  it("applies user stats once for registered single-player win and marks aggregated", async () => {
    const finished = new Date("2026-04-20T12:00:00.000Z");
    gameFindUnique.mockResolvedValue({
      id: "g1",
      mode: GameMode.SINGLE,
      status: GameStatus.WON,
      cardId: "card-xyz",
      finishedAt: finished,
      statsAggregatedAt: null,
      gamePlayers: [
        {
          id: "gp1",
          userId: "11111111-1111-4111-8111-111111111111",
          guestId: null,
          didWin: true,
        },
      ],
      guesses: [
        { gamePlayerId: "gp1", timeTakenMs: 50 },
        { gamePlayerId: "gp1", timeTakenMs: 50 },
      ],
    });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g1");

    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledTimes(1);
    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        won: true,
        attemptsToWin: 2,
        timeToWinMs: 100,
        lastPlayedAt: finished,
      }),
    );
    expect(mergeUserCardStatsAfterGameInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        cardId: "card-xyz",
        won: true,
        attempts: 2,
        durationMs: 100,
      }),
    );
    expect(gameUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { statsAggregatedAt: finished },
    });
  });

  it("treats CANCELLED as loss for registered challenger (challenge)", async () => {
    const finished = new Date("2026-04-20T13:00:00.000Z");
    gameFindUnique.mockResolvedValue({
      id: "g-ch",
      mode: GameMode.CHALLENGE,
      status: GameStatus.CANCELLED,
      cardId: "card-abandon",
      finishedAt: finished,
      statsAggregatedAt: null,
      gamePlayers: [
        {
          id: "gp-ch",
          userId: "22222222-2222-4222-8222-222222222222",
          guestId: null,
          didWin: false,
        },
      ],
      guesses: [{ gamePlayerId: "gp-ch", timeTakenMs: 10 }],
    });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g-ch");

    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: "22222222-2222-4222-8222-222222222222",
        won: false,
      }),
    );
    expect(mergeUserCardStatsAfterGameInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        cardId: "card-abandon",
        won: false,
        attempts: 1,
      }),
    );
  });

  it("skips guests (no UserStat / UserCardStat calls)", async () => {
    gameFindUnique.mockResolvedValue({
      id: "g-guest",
      mode: GameMode.SINGLE,
      status: GameStatus.LOST,
      cardId: "c1",
      finishedAt: new Date(),
      statsAggregatedAt: null,
      gamePlayers: [
        {
          id: "gp-g",
          userId: null,
          guestId: "guest-only",
          didWin: false,
        },
      ],
      guesses: [],
    });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g-guest");

    expect(applyGameOutcomeToUserStatsInTx).not.toHaveBeenCalled();
    expect(mergeUserCardStatsAfterGameInTx).not.toHaveBeenCalled();
    expect(gameUpdate).toHaveBeenCalled();
  });

  it("applies for each registered co-op player on shared WON (COOP mode)", async () => {
    const finished = new Date("2026-04-20T12:00:00.000Z");
    gameFindUnique.mockResolvedValue({
      id: "g-coop",
      mode: GameMode.COOP,
      status: GameStatus.WON,
      cardId: "card-coop",
      finishedAt: finished,
      statsAggregatedAt: null,
      gamePlayers: [
        {
          id: "gp-a",
          userId: "11111111-1111-4111-8111-111111111111",
          guestId: null,
          didWin: true,
        },
        {
          id: "gp-b",
          userId: "22222222-2222-4222-8222-222222222222",
          guestId: null,
          didWin: true,
        },
      ],
      guesses: [
        { gamePlayerId: "gp-a", timeTakenMs: 10 },
        { gamePlayerId: "gp-b", timeTakenMs: 20 },
      ],
    });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g-coop");

    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledTimes(2);
    expect(mergeUserCardStatsAfterGameInTx).toHaveBeenCalledTimes(2);
  });

  it("applies per-player outcomes for COMPETITIVE (win + loss in same game)", async () => {
    const finished = new Date("2026-04-20T12:00:00.000Z");
    gameFindUnique.mockResolvedValue({
      id: "g-comp",
      mode: GameMode.COMPETITIVE,
      status: GameStatus.WON,
      cardId: "card-c",
      finishedAt: finished,
      statsAggregatedAt: null,
      gamePlayers: [
        {
          id: "gp-w",
          userId: "11111111-1111-4111-8111-111111111111",
          guestId: null,
          didWin: true,
        },
        {
          id: "gp-l",
          userId: "33333333-3333-4333-8333-333333333333",
          guestId: null,
          didWin: false,
        },
      ],
      guesses: [
        { gamePlayerId: "gp-w", timeTakenMs: 5 },
        { gamePlayerId: "gp-l", timeTakenMs: 7 },
        { gamePlayerId: "gp-l", timeTakenMs: 8 },
      ],
    });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g-comp");

    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        won: true,
        attemptsToWin: 1,
        timeToWinMs: 5,
      }),
    );
    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: "33333333-3333-4333-8333-333333333333",
        won: false,
        attemptsToWin: undefined,
        timeToWinMs: undefined,
      }),
    );
    expect(mergeUserCardStatsAfterGameInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        userId: "33333333-3333-4333-8333-333333333333",
        won: false,
        attempts: 2,
        durationMs: 15,
      }),
    );
  });

  it("skips only guest in COOP but applies for the registered user", async () => {
    const finished = new Date("2026-04-20T12:00:00.000Z");
    gameFindUnique.mockResolvedValue({
      id: "g-coop-mix",
      mode: GameMode.COOP,
      status: GameStatus.LOST,
      cardId: "card-c",
      finishedAt: finished,
      statsAggregatedAt: null,
      gamePlayers: [
        {
          id: "gp-u",
          userId: "11111111-1111-4111-8111-111111111111",
          guestId: null,
          didWin: false,
        },
        {
          id: "gp-g",
          userId: null,
          guestId: "gx",
          didWin: false,
        },
      ],
      guesses: [
        { gamePlayerId: "gp-u", timeTakenMs: 10 },
        { gamePlayerId: "gp-g", timeTakenMs: 0 },
      ],
    });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g-coop-mix");

    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledTimes(1);
    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ userId: "11111111-1111-4111-8111-111111111111", won: false }),
    );
  });

  it("second invocation does not double-apply (statsAggregatedAt gate, COOP)", async () => {
    const finished = new Date("2026-04-20T14:00:00.000Z");
    gameFindUnique
      .mockResolvedValueOnce({
        id: "g2",
        mode: GameMode.COOP,
        status: GameStatus.LOST,
        cardId: "c2",
        finishedAt: finished,
        statsAggregatedAt: null,
        gamePlayers: [
          {
            id: "gp2",
            userId: "33333333-3333-4333-8333-333333333333",
            guestId: null,
            didWin: false,
          },
        ],
        guesses: [],
      })
      .mockResolvedValueOnce({
        id: "g2",
        mode: GameMode.COOP,
        status: GameStatus.LOST,
        cardId: "c2",
        finishedAt: finished,
        statsAggregatedAt: finished,
        gamePlayers: [
          {
            id: "gp2",
            userId: "33333333-3333-4333-8333-333333333333",
            guestId: null,
            didWin: false,
          },
        ],
        guesses: [],
      });

    const { applyRegisteredUserStatsForTerminalGameInTx } = await import(
      "@/server/services/terminal-game-stats-service"
    );
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g2");
    await applyRegisteredUserStatsForTerminalGameInTx(tx as never, "g2");

    expect(applyGameOutcomeToUserStatsInTx).toHaveBeenCalledTimes(1);
    expect(mergeUserCardStatsAfterGameInTx).toHaveBeenCalledTimes(1);
  });
});
