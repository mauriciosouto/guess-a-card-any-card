import type { Prisma } from "@/generated/prisma/client";
import {
  ChallengeOutcome,
  ChallengeStatus,
  GameMode,
  GameStatus,
} from "@/generated/prisma/client";
import {
  DisplayNameResolutionError,
  resolveGamePlayerDisplayNameForSession,
} from "@/lib/game-player-display-name";
import { prisma } from "@/lib/prisma";
import { resolveFabCardArtUrl } from "@/lib/card-art-url";
import { newRevealSeed } from "@/lib/game-card-resolution";
import { revealProfileFromFabCard } from "@/lib/fab-reveal-profile";
import { getCatalogCardById } from "@/server/services/card-catalog-service";
import type { PlayerIdentity } from "@/lib/player-identity";

export class ChallengeHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ChallengeHttpError";
  }
}

function matchesChallengeHost(
  challenge: { createdByUserId: string | null; createdByGuestId: string | null },
  identity: PlayerIdentity,
): boolean {
  if (identity.userId) return challenge.createdByUserId === identity.userId;
  return Boolean(identity.guestId && challenge.createdByGuestId === identity.guestId);
}

/** Call inside the same transaction that sets the challenge {@link Game} to a terminal status. */
export async function applyChallengeCompletionInTx(
  tx: Prisma.TransactionClient,
  gameId: string,
): Promise<void> {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    select: { id: true, mode: true, status: true },
  });
  if (!game || game.mode !== GameMode.CHALLENGE) return;
  if (
    game.status !== GameStatus.WON &&
    game.status !== GameStatus.LOST &&
    game.status !== GameStatus.CANCELLED
  ) {
    return;
  }

  const challenge = await tx.challenge.findUnique({
    where: { gameId: game.id },
  });
  if (!challenge || challenge.status === ChallengeStatus.COMPLETED) return;

  const guesses = await tx.guess.findMany({
    where: { gameId: game.id },
    orderBy: { createdAt: "asc" },
  });
  const attemptsUsed = guesses.length;
  const timeMs = guesses.reduce((s, g) => s + g.timeTakenMs, 0);
  const finalGuess = guesses.length > 0 ? guesses[guesses.length - 1]!.guessText : null;

  let outcome: ChallengeOutcome;
  if (game.status === GameStatus.WON) outcome = ChallengeOutcome.WON;
  else if (game.status === GameStatus.CANCELLED) outcome = ChallengeOutcome.ABANDONED;
  else outcome = ChallengeOutcome.LOST;

  await tx.challenge.update({
    where: { id: challenge.id },
    data: {
      status: ChallengeStatus.COMPLETED,
      outcome,
      completedAt: new Date(),
      attemptsUsed,
      timeMs,
      finalGuess,
    },
  });
}

export async function createChallenge(params: {
  cardId: string;
  hostIdentity: PlayerIdentity;
}): Promise<{ challengeId: string }> {
  const catalogCard = getCatalogCardById(params.cardId.trim());
  if (!catalogCard) {
    throw new ChallengeHttpError(400, "Unknown or unplayable card id.");
  }

  const { revealCardKind, cardTemplateKey } = revealProfileFromFabCard(catalogCard.fabCard);
  const cardImageUrl = resolveFabCardArtUrl(catalogCard.imageUrl);
  const revealSeed = newRevealSeed();

  const row = await prisma.challenge.create({
    data: {
      createdByUserId: params.hostIdentity.userId,
      createdByGuestId: params.hostIdentity.userId ? null : params.hostIdentity.guestId,
      cardId: catalogCard.id,
      cardName: catalogCard.name,
      cardSet: catalogCard.setKey,
      cardImageUrl,
      revealSeed,
      revealCardKind,
      cardTemplateKey,
      status: ChallengeStatus.PENDING,
    },
  });

  return { challengeId: row.id };
}

export type ChallengePublicSafe = {
  id: string;
  status: ChallengeStatus;
  /** Present when `status === COMPLETED` (summary for host UI; full log via `getChallengeResult`). */
  outcome?: ChallengeOutcome;
  attemptsUsed?: number;
  timeMs?: number;
};

export async function getChallengePublic(challengeId: string): Promise<ChallengePublicSafe> {
  const row = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true,
      status: true,
      outcome: true,
      attemptsUsed: true,
      timeMs: true,
    },
  });
  if (!row) throw new ChallengeHttpError(404, "Challenge not found.");
  if (row.status === ChallengeStatus.COMPLETED) {
    return {
      id: row.id,
      status: row.status,
      outcome: row.outcome ?? undefined,
      attemptsUsed: row.attemptsUsed ?? undefined,
      timeMs: row.timeMs ?? undefined,
    };
  }
  return { id: row.id, status: row.status };
}

export async function startChallenge(params: {
  challengeId: string;
  playerIdentity: PlayerIdentity;
}): Promise<{ gameId: string }> {
  let displayName: string;
  try {
    displayName = await resolveGamePlayerDisplayNameForSession(params.playerIdentity);
  } catch (e) {
    if (e instanceof DisplayNameResolutionError) {
      throw new ChallengeHttpError(e.status, e.message);
    }
    throw e;
  }

  const gameId = await prisma.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({
      where: { id: params.challengeId },
    });
    if (!challenge) throw new ChallengeHttpError(404, "Challenge not found.");
    if (challenge.status === ChallengeStatus.COMPLETED) {
      throw new ChallengeHttpError(409, "This challenge is already finished.");
    }
    if (challenge.status !== ChallengeStatus.PENDING || challenge.gameId != null) {
      throw new ChallengeHttpError(409, "This challenge has already been started.");
    }

    const game = await tx.game.create({
      data: {
        roomId: null,
        mode: GameMode.CHALLENGE,
        cardId: challenge.cardId,
        cardName: challenge.cardName,
        cardSet: challenge.cardSet,
        cardImageUrl: challenge.cardImageUrl,
        revealSeed: challenge.revealSeed,
        revealCardKind: challenge.revealCardKind,
        cardTemplateKey: challenge.cardTemplateKey,
        status: GameStatus.IN_PROGRESS,
        currentStep: 1,
      },
    });

    await tx.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: params.playerIdentity.userId,
        guestId: params.playerIdentity.userId ? null : params.playerIdentity.guestId,
        displayName,
      },
    });

    await tx.challenge.update({
      where: { id: challenge.id },
      data: {
        gameId: game.id,
        status: ChallengeStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    return game.id;
  });

  return { gameId };
}

export type ChallengeResultLine = {
  id: string;
  stepNumber: number;
  guessText: string;
  isCorrect: boolean;
  timeTakenMs: number;
  createdAt: string;
};

export type ChallengeResultPublic = {
  outcome: ChallengeOutcome;
  attemptsUsed: number;
  timeMs: number;
  finalGuess: string | null;
  guesses: ChallengeResultLine[];
  cardId: string;
  cardName: string;
};

export async function getChallengeResult(params: {
  challengeId: string;
  hostIdentity: PlayerIdentity;
}): Promise<ChallengeResultPublic> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: params.challengeId },
    include: {
      game: {
        include: {
          guesses: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!challenge) throw new ChallengeHttpError(404, "Challenge not found.");
  if (!matchesChallengeHost(challenge, params.hostIdentity)) {
    throw new ChallengeHttpError(403, "Only the host may view this result.");
  }
  if (challenge.status !== ChallengeStatus.COMPLETED || !challenge.outcome) {
    throw new ChallengeHttpError(409, "Challenge is not finished yet.");
  }
  if (!challenge.game) {
    throw new ChallengeHttpError(500, "Challenge has no game record.");
  }

  const guesses = challenge.game.guesses;
  const attemptsUsed = challenge.attemptsUsed ?? guesses.length;
  const timeMs = challenge.timeMs ?? guesses.reduce((s, g) => s + g.timeTakenMs, 0);

  return {
    outcome: challenge.outcome,
    attemptsUsed,
    timeMs,
    finalGuess: challenge.finalGuess ?? null,
    cardId: challenge.cardId,
    cardName: challenge.cardName,
    guesses: guesses.map((g) => ({
      id: g.id,
      stepNumber: g.stepNumber,
      guessText: g.guessText,
      isCorrect: g.isCorrect,
      timeTakenMs: g.timeTakenMs,
      createdAt: g.createdAt.toISOString(),
    })),
  };
}
