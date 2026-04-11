import { GameStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeGuessText } from "@/lib/game/guess-normalize";
import { resolveStepImageUrl } from "@/lib/game/puzzle-step-image";
import {
  resolveSinglePlayerGuess,
  singlePlayerAttemptCounts,
} from "@/lib/game/single-player-logic";
import type { HostKey } from "@/server/repositories/puzzle-repository";
import { mergeUserCardStatsAfterGame } from "@/server/repositories/stats-repository";
import { recordRegisteredUserGameOutcome } from "@/server/services/stats-service";
import {
  notifyPuzzleCompletedForHost,
  resolvePuzzleForNewGame,
} from "@/server/services/puzzle-service";

export class SinglePlayerHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "SinglePlayerHttpError";
  }
}

export type PlayerIdentity = {
  guestId: string | null;
  userId: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePlayerIdentityFromHeaders(headers: {
  get(name: string): string | null;
}): PlayerIdentity {
  const rawUser = headers.get("x-user-id")?.trim() ?? null;
  const rawGuest = headers.get("x-guest-id")?.trim() ?? null;

  if (rawUser && UUID_RE.test(rawUser)) {
    return { userId: rawUser, guestId: null };
  }
  if (rawGuest) {
    return { guestId: rawGuest, userId: null };
  }
  throw new SinglePlayerHttpError(
    400,
    "Provide X-User-Id (registered) or X-Guest-Id (guest).",
  );
}

function hostKeyFromIdentity(id: PlayerIdentity): HostKey | null {
  if (id.userId) return { hostUserId: id.userId };
  if (id.guestId) return { hostGuestId: id.guestId };
  return null;
}

function matchesGamePlayer(
  player: { guestId: string | null; userId: string | null },
  id: PlayerIdentity,
): boolean {
  if (id.userId) return player.userId === id.userId;
  return player.guestId === id.guestId;
}

/** DB `GamePlayer.displayName` — user/guest label + local date-time (no player prompt). */
async function resolveSinglePlayerSessionDisplayName(
  identity: PlayerIdentity,
): Promise<string> {
  const ts = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  if (identity.userId) {
    const user = await prisma.user.findUnique({
      where: { id: identity.userId },
      select: { displayName: true },
    });
    if (!user) throw new SinglePlayerHttpError(400, "Unknown user id.");
    const label = user.displayName.trim() || identity.userId;
    return `${label} · ${ts}`;
  }

  if (!identity.guestId) {
    throw new SinglePlayerHttpError(400, "Missing player identity.");
  }
  const gid = identity.guestId;
  const idPart = gid.length > 24 ? `${gid.slice(0, 10)}…` : gid;
  return `${idPart} · ${ts}`;
}

export type SingleGameGuessLine = {
  id: string;
  stepNumber: number;
  guessText: string;
  isCorrect: boolean;
  createdAt: string;
};

export type SingleGamePublic = {
  id: string;
  status: GameStatus;
  currentStep: number | null;
  totalSteps: number;
  /** Full card art for client-side FAB overlays (`generateRegions(seed, step)`). */
  cardImageUrl: string;
  puzzleSeed: string;
  currentImageUrl: string | null;
  cardName: string | null;
  dataSource: string | null;
  /** FAB set code from admin when present; null for legacy or non-FAB puzzles. */
  fabSet: string | null;
  attemptCount: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  guesses: SingleGameGuessLine[];
};

export async function startSinglePlayerGame(params: {
  /** FAB set codes from the lobby dropdown; empty = any playable FAB puzzle. */
  selectedFabSets: string[];
  identity: PlayerIdentity;
}): Promise<{ gameId: string }> {
  const host = hostKeyFromIdentity(params.identity);
  if (!host) throw new SinglePlayerHttpError(400, "Missing player identity.");

  const displayName = await resolveSinglePlayerSessionDisplayName(params.identity);

  const puzzle = await resolvePuzzleForNewGame({
    selectedFabSets: params.selectedFabSets,
    host,
    recentHistoryLimit: 50,
  });

  if (!puzzle) {
    throw new SinglePlayerHttpError(
      400,
      params.selectedFabSets.length > 0
        ? "No puzzle found for those FAB sets — try another selection or leave sets open for any."
        : "No playable FAB puzzle found.",
    );
  }

  const orderedSteps = [...puzzle.steps].sort((a, b) => a.step - b.step);
  if (orderedSteps.length === 0) {
    throw new SinglePlayerHttpError(400, "Selected omen has no steps yet.");
  }

  const gameId = await prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        roomId: null,
        mode: "SINGLE",
        puzzleId: puzzle.id,
        status: GameStatus.IN_PROGRESS,
        currentStep: 1,
      },
    });

    await tx.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: params.identity.userId,
        guestId: params.identity.userId ? null : params.identity.guestId,
        displayName,
      },
    });

    return game.id;
  });

  return { gameId };
}

async function loadSingleGameForPlayer(gameId: string, identity: PlayerIdentity) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
      include: {
        puzzle: { include: { steps: { orderBy: { step: "asc" } } } },
        guesses: { orderBy: { createdAt: "asc" }, include: { gamePlayer: true } },
        gamePlayers: true,
      },
  });

  if (!game || game.mode !== "SINGLE") {
    throw new SinglePlayerHttpError(404, "Game not found.");
  }

  const player = game.gamePlayers[0];
  if (!player || !matchesGamePlayer(player, identity)) {
    throw new SinglePlayerHttpError(403, "This thread is not yours.");
  }

  return { game, player };
}

export async function getSinglePlayerGamePublic(params: {
  gameId: string;
  identity: PlayerIdentity;
}): Promise<SingleGamePublic> {
  const { game, player: _player } = await loadSingleGameForPlayer(
    params.gameId,
    params.identity,
  );
  void _player;

  return buildSingleGamePublic(game);
}

function buildSingleGamePublic(game: {
  status: GameStatus;
  currentStep: number | null;
  guesses: Array<{
    id: string;
    stepNumber: number;
    guessText: string;
    isCorrect: boolean;
    createdAt: Date;
  }>;
  puzzle: {
    cardName: string;
    dataSource: string;
    fabSet: string | null;
    imageUrl: string;
    seed: string;
    steps: Array<{ step: number; imageUrl: string | null }>;
  };
} & { id: string }): SingleGamePublic {
  const orderedSteps = [...game.puzzle.steps].sort((a, b) => a.step - b.step);
  const totalSteps = orderedSteps.length;
  const terminal = game.status === GameStatus.WON || game.status === GameStatus.LOST;
  const stepIdx = (game.currentStep ?? 1) - 1;
  const stepRow = orderedSteps[stepIdx] ?? orderedSteps[0];
  const imageUrl = stepRow
    ? resolveStepImageUrl(game.puzzle, stepRow)
    : resolveStepImageUrl(game.puzzle, orderedSteps[0] ?? null);

  const { used, remaining } = singlePlayerAttemptCounts(totalSteps, game.guesses.length);

  return {
    id: game.id,
    status: game.status,
    currentStep: game.currentStep,
    totalSteps,
    cardImageUrl: game.puzzle.imageUrl,
    puzzleSeed: game.puzzle.seed,
    currentImageUrl: terminal
      ? resolveStepImageUrl(game.puzzle, orderedSteps[totalSteps - 1]!)
      : imageUrl,
    cardName: terminal ? game.puzzle.cardName : null,
    dataSource: terminal ? game.puzzle.dataSource : null,
    fabSet: terminal ? game.puzzle.fabSet : null,
    attemptCount: game.guesses.length,
    attemptsUsed: used,
    attemptsRemaining: remaining,
    guesses: game.guesses.map((g) => ({
      id: g.id,
      stepNumber: g.stepNumber,
      guessText: g.guessText,
      isCorrect: g.isCorrect,
      createdAt: g.createdAt.toISOString(),
    })),
  };
}

export async function forfeitSinglePlayerGame(params: {
  gameId: string;
  identity: PlayerIdentity;
}): Promise<{ status: GameStatus }> {
  const txResult = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: params.gameId },
      include: { gamePlayers: true },
    });

    if (!game || game.mode !== "SINGLE") {
      throw new SinglePlayerHttpError(404, "Game not found.");
    }
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new SinglePlayerHttpError(409, "This reading already ended.");
    }

    const player = game.gamePlayers[0];
    if (!player || !matchesGamePlayer(player, params.identity)) {
      throw new SinglePlayerHttpError(403, "This thread is not yours.");
    }

    await tx.game.update({
      where: { id: game.id },
      data: {
        status: GameStatus.LOST,
        finishedAt: new Date(),
      },
    });
    await tx.gamePlayer.update({
      where: { id: player.id },
      data: { didWin: false },
    });

    return { player, puzzleId: game.puzzleId };
  });

  const hk = hostKeyFromIdentity({
    userId: txResult.player.userId,
    guestId: txResult.player.guestId,
  });
  if (hk) {
    await notifyPuzzleCompletedForHost(hk, txResult.puzzleId).catch(() => {});
  }

  if (txResult.player.userId) {
    const guesses = await prisma.guess.findMany({
      where: { gameId: params.gameId },
      orderBy: { createdAt: "asc" },
    });
    const attempted = guesses.length;
    const duration = guesses.reduce((s, g) => s + g.timeTakenMs, 0);

    await recordRegisteredUserGameOutcome({
      userId: txResult.player.userId,
      won: false,
    }).catch(() => {});

    await mergeUserCardStatsAfterGame({
      userId: txResult.player.userId,
      puzzleId: txResult.puzzleId,
      won: false,
      attempts: attempted,
      durationMs: duration,
    }).catch(() => {});
  }

  return { status: GameStatus.LOST };
}

export async function submitSinglePlayerGuess(params: {
  gameId: string;
  identity: PlayerIdentity;
  guessText: string;
  timeTakenMs: number;
}): Promise<{ status: GameStatus }> {
  const normalized = normalizeGuessText(params.guessText);
  if (!normalized) {
    throw new SinglePlayerHttpError(400, "Speak a name, not silence.");
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: params.gameId },
      include: {
        puzzle: { include: { steps: { orderBy: { step: "asc" } } } },
        guesses: true,
        gamePlayers: true,
      },
    });

    if (!game || game.mode !== "SINGLE") throw new SinglePlayerHttpError(404, "Game not found.");
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new SinglePlayerHttpError(409, "This reading already ended.");
    }

    const player = game.gamePlayers[0];
    if (!player || !matchesGamePlayer(player, params.identity)) {
      throw new SinglePlayerHttpError(403, "This thread is not yours.");
    }

    const stepNum = game.currentStep ?? 1;
    const existingForStep = await tx.guess.findFirst({
      where: { gameId: game.id, stepNumber: stepNum },
    });
    if (existingForStep) {
      throw new SinglePlayerHttpError(409, "You already sealed a guess for this step.");
    }

    const orderedSteps = [...game.puzzle.steps].sort((a, b) => a.step - b.step);
    const totalSteps = orderedSteps.length;
    const cardNorm = normalizeGuessText(game.puzzle.cardName);

    const resolution = resolveSinglePlayerGuess({
      currentStep: stepNum,
      totalSteps,
      normalizedGuess: normalized,
      normalizedCardName: cardNorm,
    });

    await tx.guess.create({
      data: {
        gameId: game.id,
        gamePlayerId: player.id,
        stepNumber: stepNum,
        guessText: params.guessText.trim(),
        normalizedGuessText: normalized,
        isCorrect: resolution.outcome === "win",
        timeTakenMs: Math.max(0, params.timeTakenMs),
        submittedByHostOverride: false,
      },
    });

    const allGuesses = await tx.guess.findMany({
      where: { gameId: game.id },
      orderBy: { createdAt: "asc" },
    });
    const attemptCount = allGuesses.length;
    const totalTimeMs = allGuesses.reduce((s, g) => s + g.timeTakenMs, 0);

    if (resolution.outcome === "win") {
      await tx.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.WON,
          finishedAt: new Date(),
          winningAttemptCount: attemptCount,
          winningTotalTimeMs: totalTimeMs,
          winnerUserId: player.userId,
          winnerGuestId: player.userId ? null : player.guestId,
        },
      });
      await tx.gamePlayer.update({
        where: { id: player.id },
        data: {
          didWin: true,
          solvedAtStep: stepNum,
          solvedTotalTimeMs: totalTimeMs,
        },
      });
      return { status: GameStatus.WON, player, puzzleId: game.puzzleId };
    }

    if (resolution.outcome === "lose") {
      await tx.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.LOST,
          finishedAt: new Date(),
        },
      });
      await tx.gamePlayer.update({
        where: { id: player.id },
        data: { didWin: false },
      });
      return { status: GameStatus.LOST, player, puzzleId: game.puzzleId };
    }

    await tx.game.update({
      where: { id: game.id },
      data: { currentStep: resolution.nextStep },
    });

    return {
      status: GameStatus.IN_PROGRESS,
      player,
      puzzleId: game.puzzleId,
    };
  });

  if (txResult.status === GameStatus.WON || txResult.status === GameStatus.LOST) {
    const hk = hostKeyFromIdentity({
      userId: txResult.player.userId,
      guestId: txResult.player.guestId,
    });
    if (hk) {
      await notifyPuzzleCompletedForHost(hk, txResult.puzzleId).catch(() => {});
    }

    if (txResult.player.userId) {
      const guesses = await prisma.guess.findMany({
        where: { gameId: params.gameId },
        orderBy: { createdAt: "asc" },
      });
      const attempted = guesses.length;
      const duration = guesses.reduce((s, g) => s + g.timeTakenMs, 0);

      await recordRegisteredUserGameOutcome({
        userId: txResult.player.userId,
        won: txResult.status === GameStatus.WON,
        attemptsToWin: txResult.status === GameStatus.WON ? attempted : undefined,
        timeToWinMs: txResult.status === GameStatus.WON ? duration : undefined,
      }).catch(() => {});

      await mergeUserCardStatsAfterGame({
        userId: txResult.player.userId,
        puzzleId: txResult.puzzleId,
        won: txResult.status === GameStatus.WON,
        attempts: attempted,
        durationMs: duration,
      }).catch(() => {});
    }
  }

  return { status: txResult.status };
}
