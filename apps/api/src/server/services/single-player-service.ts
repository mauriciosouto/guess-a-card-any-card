import { GameMode, GameStatus, type Game } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeGuessText } from "@/lib/game/guess-normalize";
import { resolveCatalogCardArtUrl } from "@/lib/card-art-url";
import { revealProfileFromFabCard } from "@/lib/fab-reveal-profile";
import { newRevealSeed, resolveGameCard } from "@/lib/game-card-resolution";
import {
  resolveSinglePlayerGuess,
  singlePlayerAttemptCounts,
} from "@/lib/game/single-player-logic";
import type { CardTemplateKey, CardZoneValidityKind } from "@gac/shared/reveal";
import {
  DisplayNameResolutionError,
  resolveGamePlayerDisplayNameForSession,
} from "@/lib/game-player-display-name";
import type { PlayerIdentity } from "@/lib/player-identity";
import {
  gamePlayerOwnershipFromIdentity,
  PlayerIdentityPersistenceError,
} from "@/lib/player-identity-persistence";
import { applyChallengeCompletionInTx } from "@/server/services/challenge-service";
import { applyRegisteredUserStatsForTerminalGameInTx } from "@/server/services/terminal-game-stats-service";
import { getRandomCard } from "@/server/services/card-catalog-service";

export class SinglePlayerHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "SinglePlayerHttpError";
  }
}

export type { PlayerIdentity } from "@/lib/player-identity";

function matchesGamePlayer(
  player: { guestId: string | null; userId: string | null },
  id: PlayerIdentity,
): boolean {
  if (id.userId) return player.userId === id.userId;
  return player.guestId === id.guestId;
}

async function resolveSinglePlayerSessionDisplayName(
  identity: PlayerIdentity,
): Promise<string> {
  try {
    return await resolveGamePlayerDisplayNameForSession(identity);
  } catch (e) {
    if (e instanceof DisplayNameResolutionError) {
      throw new SinglePlayerHttpError(e.status, e.message);
    }
    throw e;
  }
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
  cardId: string;
  /** Full card art for client-side reveal overlays. */
  cardImageUrl: string;
  revealSeed: string;
  currentImageUrl: string | null;
  /** Matches `@gac/shared/reveal` inputs for `getRevealStateAtStep`. */
  revealCardKind: CardZoneValidityKind;
  cardTemplateKey: CardTemplateKey;
  cardName: string | null;
  dataSource: string | null;
  /** FAB catalog set code. */
  fabSet: string | null;
  attemptCount: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  guesses: SingleGameGuessLine[];
};

export async function startSinglePlayerGame(params: {
  /** FAB release names from the lobby; empty = full catalog pool. */
  selectedFabSets: string[];
  identity: PlayerIdentity;
}): Promise<{ gameId: string; game: SingleGamePublic }> {
  let ownership: { userId: string | null; guestId: string | null };
  try {
    ownership = gamePlayerOwnershipFromIdentity(params.identity);
  } catch (e) {
    if (e instanceof PlayerIdentityPersistenceError) {
      throw new SinglePlayerHttpError(e.status, e.message);
    }
    throw e;
  }

  const displayName = await resolveSinglePlayerSessionDisplayName(params.identity);

  const catalogCard = getRandomCard(params.selectedFabSets);
  if (!catalogCard) {
    throw new SinglePlayerHttpError(
      400,
      params.selectedFabSets.length > 0
        ? "No card in the catalog for those sets — try another selection or leave sets open for any."
        : "No playable card found in the catalog.",
    );
  }

  const { revealCardKind, cardTemplateKey } = revealProfileFromFabCard(catalogCard.fabCard);
  const cardImageUrl = resolveCatalogCardArtUrl(catalogCard.imageUrl, catalogCard.printing);

  const gameId = await prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        roomId: null,
        mode: "SINGLE",
        cardId: catalogCard.id,
        cardName: catalogCard.name,
        cardSet: catalogCard.setKey,
        cardImageUrl,
        revealSeed: newRevealSeed(),
        revealCardKind,
        cardTemplateKey,
        status: GameStatus.IN_PROGRESS,
        currentStep: 1,
      },
    });

    await tx.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: ownership.userId,
        guestId: ownership.guestId,
        displayName,
      },
    });

    return game.id;
  });

  const game = await getSinglePlayerGamePublic({
    gameId,
    identity: params.identity,
  });
  return { gameId, game };
}

async function loadSingleGameForPlayer(gameId: string, identity: PlayerIdentity) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      guesses: { orderBy: { createdAt: "asc" }, include: { gamePlayer: true } },
      gamePlayers: true,
    },
  });

  if (!game || (game.mode !== GameMode.SINGLE && game.mode !== GameMode.CHALLENGE)) {
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

function buildSingleGamePublic(
  game: Game & {
    status: GameStatus;
    currentStep: number | null;
    guesses: Array<{
      id: string;
      stepNumber: number;
      guessText: string;
      isCorrect: boolean;
      createdAt: Date;
    }>;
  },
): SingleGamePublic {
  const resolved = resolveGameCard(game);
  const totalSteps = resolved.totalSteps;
  const terminal =
    game.status === GameStatus.WON ||
    game.status === GameStatus.LOST ||
    game.status === GameStatus.CANCELLED;

  const { used, remaining } = singlePlayerAttemptCounts(totalSteps, game.guesses.length);

  return {
    id: game.id,
    status: game.status,
    currentStep: game.currentStep,
    totalSteps,
    cardId: game.cardId,
    cardImageUrl: resolved.cardImageUrl,
    revealSeed: resolved.seed,
    currentImageUrl: resolved.cardImageUrl,
    revealCardKind: resolved.revealCardKind,
    cardTemplateKey: resolved.cardTemplateKey,
    cardName: terminal ? resolved.cardName : null,
    dataSource: terminal ? resolved.dataSource : null,
    fabSet: terminal ? resolved.fabSet : null,
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
}): Promise<SingleGamePublic> {
  const txResult = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: params.gameId },
      include: { gamePlayers: true },
    });

    if (!game || (game.mode !== GameMode.SINGLE && game.mode !== GameMode.CHALLENGE)) {
      throw new SinglePlayerHttpError(404, "Game not found.");
    }
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new SinglePlayerHttpError(409, "This reading already ended.");
    }

    const player = game.gamePlayers[0];
    if (!player || !matchesGamePlayer(player, params.identity)) {
      throw new SinglePlayerHttpError(403, "This thread is not yours.");
    }

    const terminalStatus =
      game.mode === GameMode.CHALLENGE ? GameStatus.CANCELLED : GameStatus.LOST;

    await tx.game.update({
      where: { id: game.id },
      data: {
        status: terminalStatus,
        finishedAt: new Date(),
      },
    });
    await tx.gamePlayer.update({
      where: { id: player.id },
      data: { didWin: false },
    });

    await applyChallengeCompletionInTx(tx, game.id);
    await applyRegisteredUserStatsForTerminalGameInTx(tx, game.id);

    return { player, cardId: game.cardId, terminalStatus };
  });

  return getSinglePlayerGamePublic({
    gameId: params.gameId,
    identity: params.identity,
  });
}

export async function submitSinglePlayerGuess(params: {
  gameId: string;
  identity: PlayerIdentity;
  guessText: string;
  timeTakenMs: number;
}): Promise<SingleGamePublic> {
  const normalized = normalizeGuessText(params.guessText);
  if (!normalized) {
    throw new SinglePlayerHttpError(400, "Speak a name, not silence.");
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: params.gameId },
      include: {
        guesses: true,
        gamePlayers: true,
      },
    });

    if (!game || (game.mode !== GameMode.SINGLE && game.mode !== GameMode.CHALLENGE)) {
      throw new SinglePlayerHttpError(404, "Game not found.");
    }
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

    const resolved = resolveGameCard(game);
    const totalSteps = resolved.totalSteps;
    const cardNorm = normalizeGuessText(resolved.cardName);

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
      await applyChallengeCompletionInTx(tx, game.id);
      await applyRegisteredUserStatsForTerminalGameInTx(tx, game.id);
      return { status: GameStatus.WON, player, cardId: game.cardId };
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
      await applyChallengeCompletionInTx(tx, game.id);
      await applyRegisteredUserStatsForTerminalGameInTx(tx, game.id);
      return { status: GameStatus.LOST, player, cardId: game.cardId };
    }

    await tx.game.update({
      where: { id: game.id },
      data: { currentStep: resolution.nextStep },
    });

    return {
      status: GameStatus.IN_PROGRESS,
      player,
      cardId: game.cardId,
    };
  });

  return getSinglePlayerGamePublic({
    gameId: params.gameId,
    identity: params.identity,
  });
}
