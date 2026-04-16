import {
  CompetitivePlayerState,
  GameStatus,
  Prisma,
  RoomState,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { guessesAreEqual, normalizeGuessText } from "@/lib/game/guess-normalize";
import {
  assignCompetitiveRanks,
  resolveCompetitiveGuessOnStep,
} from "@/lib/game/competitive-logic";
import { resolveFabCardArtUrl } from "@/lib/card-art-url";
import { revealProfileFromFabCard } from "@/lib/fab-reveal-profile";
import { newRevealSeed, resolveGameCard, type GameForCardResolution } from "@/lib/game-card-resolution";
import type { CardTemplateKey, CardZoneValidityKind } from "@gac/shared/reveal";
import { getRandomCard } from "@/server/services/card-catalog-service";

export class CompetitiveHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "CompetitiveHttpError";
  }
}

async function requireRoomPlayer(roomId: string, guestId: string) {
  const rp = await prisma.roomPlayer.findFirst({
    where: { roomId, guestId, leftAt: null },
  });
  if (!rp) throw new CompetitiveHttpError(403, "You are not in this room.");
  return rp;
}

async function requireHost(roomId: string, guestId: string) {
  const rp = await requireRoomPlayer(roomId, guestId);
  if (!rp.isHost) throw new CompetitiveHttpError(403, "Only the host may do that.");
  return rp;
}

function isRacingState(s: CompetitivePlayerState | null): boolean {
  return s === null || s === CompetitivePlayerState.RACING;
}

async function sumGuessTimeMs(
  tx: Prisma.TransactionClient,
  gamePlayerId: string,
): Promise<number> {
  const agg = await tx.guess.aggregate({
    where: { gamePlayerId },
    _sum: { timeTakenMs: true },
  });
  return agg._sum.timeTakenMs ?? 0;
}

async function attemptCount(tx: Prisma.TransactionClient, gamePlayerId: string): Promise<number> {
  return tx.guess.count({ where: { gamePlayerId } });
}

async function finishCompetitiveGame(
  tx: Prisma.TransactionClient,
  gameId: string,
  roomId: string,
): Promise<void> {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    include: {
      gamePlayers: true,
    },
  });
  if (!game) return;

  const rankInputs = await Promise.all(
    game.gamePlayers.map(async (gp) => ({
      id: gp.id,
      competitiveState: gp.competitiveState,
      attemptCount: await attemptCount(tx, gp.id),
      totalTimeMs: await sumGuessTimeMs(tx, gp.id),
    })),
  );

  const ranks = assignCompetitiveRanks(
    rankInputs.map((r) => ({
      id: r.id,
      competitiveState:
        r.competitiveState === CompetitivePlayerState.SOLVED
          ? ("SOLVED" as const)
          : r.competitiveState === CompetitivePlayerState.ELIMINATED
            ? ("ELIMINATED" as const)
            : r.competitiveState === CompetitivePlayerState.RACING
              ? ("RACING" as const)
              : null,
      attemptCount: r.attemptCount,
      totalTimeMs: r.totalTimeMs,
    })),
  );

  const solved = game.gamePlayers.filter(
    (g) => g.competitiveState === CompetitivePlayerState.SOLVED,
  );
  const anySolved = solved.length > 0;

  let winnerGp: (typeof game.gamePlayers)[0] | null = null;
  if (anySolved) {
    let bestRank = Infinity;
    for (const gp of solved) {
      const r = ranks.get(gp.id) ?? 999;
      if (r < bestRank) {
        bestRank = r;
        winnerGp = gp;
      }
    }
  }

  for (const gp of game.gamePlayers) {
    const fr = ranks.get(gp.id);
    await tx.gamePlayer.update({
      where: { id: gp.id },
      data: { finalRank: fr ?? null },
    });
  }

  await tx.game.update({
    where: { id: gameId },
    data: {
      status: anySolved ? GameStatus.WON : GameStatus.LOST,
      finishedAt: new Date(),
      competitiveStepDeadlineAt: null,
      winnerUserId: winnerGp?.userId ?? null,
      winnerGuestId: winnerGp?.userId ? null : winnerGp?.guestId ?? null,
      winningAttemptCount: winnerGp ? await attemptCount(tx, winnerGp.id) : null,
      winningTotalTimeMs: winnerGp ? await sumGuessTimeMs(tx, winnerGp.id) : null,
    },
  });

  await tx.room.update({
    where: { id: roomId },
    data: { state: RoomState.FINISHED },
  });
}

/**
 * Close the current step round if all racing have guessed or deadline passed; may chain.
 */
async function tryAdvanceCompetitiveRound(
  tx: Prisma.TransactionClient,
  gameId: string,
): Promise<boolean> {
  const game = await tx.game.findUnique({
    where: { id: gameId },
    include: {
      room: true,
      gamePlayers: true,
      guesses: true,
    },
  });

  if (!game || game.mode !== "COMPETITIVE" || game.status !== GameStatus.IN_PROGRESS) {
    return false;
  }
  if (!game.roomId || !game.room) throw new CompetitiveHttpError(500, "Room missing.");
  const room = game.room;
  const timerSec = room.timerPerStepSeconds ?? 0;
  if (timerSec <= 0) throw new CompetitiveHttpError(500, "Timer not configured.");

  const resolved = resolveGameCard(game as GameForCardResolution);
  const totalSteps = resolved.totalSteps;
  const stepNum = game.currentStep ?? 1;
  const cardNorm = normalizeGuessText(resolved.cardName);
  const now = new Date();
  const deadline = game.competitiveStepDeadlineAt;

  const racingPlayers = game.gamePlayers.filter((gp) => isRacingState(gp.competitiveState));
  if (racingPlayers.length === 0) {
    await finishCompetitiveGame(tx, gameId, room.id);
    return true;
  }

  const guessesThisStep = game.guesses.filter((g) => g.stepNumber === stepNum);
  const racingIds = new Set(racingPlayers.map((p) => p.id));
  const racingGuessed = guessesThisStep.filter((g) => racingIds.has(g.gamePlayerId));

  const allAnswered =
    racingGuessed.length >= racingPlayers.length &&
    racingPlayers.every((p) => racingGuessed.some((g) => g.gamePlayerId === p.id));

  const timedOut = deadline != null && now.getTime() >= deadline.getTime();

  if (!allAnswered && !timedOut) return false;

  for (const gp of racingPlayers) {
    const has = racingGuessed.some((g) => g.gamePlayerId === gp.id);
    if (!has) {
      await tx.guess.create({
        data: {
          gameId: game.id,
          gamePlayerId: gp.id,
          stepNumber: stepNum,
          guessText: "",
          normalizedGuessText: "",
          isCorrect: false,
          timeTakenMs: 0,
          submittedByHostOverride: false,
        },
      });
    }
  }

  const refreshedGuesses = await tx.guess.findMany({
    where: { gameId: game.id, stepNumber: stepNum },
  });

  for (const gp of racingPlayers) {
    const g = refreshedGuesses.find((x) => x.gamePlayerId === gp.id);
    if (!g) continue;

    const norm = g.normalizedGuessText;
    const res = resolveCompetitiveGuessOnStep({
      currentStep: stepNum,
      totalSteps,
      normalizedGuess: norm,
      normalizedCardName: cardNorm,
    });

    if (res.outcome === "solved") {
      const tMs = await sumGuessTimeMs(tx, gp.id);
      await tx.gamePlayer.update({
        where: { id: gp.id },
        data: {
          competitiveState: CompetitivePlayerState.SOLVED,
          didWin: true,
          solvedAtStep: stepNum,
          solvedTotalTimeMs: tMs,
        },
      });
    } else if (res.outcome === "eliminated") {
      await tx.gamePlayer.update({
        where: { id: gp.id },
        data: {
          competitiveState: CompetitivePlayerState.ELIMINATED,
          didWin: false,
        },
      });
    }
  }

  const after = await tx.gamePlayer.findMany({ where: { gameId: game.id } });
  const stillRacing = after.filter((gp) => isRacingState(gp.competitiveState));

  if (stillRacing.length === 0) {
    await finishCompetitiveGame(tx, gameId, room.id);
    return true;
  }

  const nextStep = stepNum + 1;
  if (nextStep > totalSteps) {
    await finishCompetitiveGame(tx, gameId, room.id);
    return true;
  }

  const nextDeadline = new Date(now.getTime() + timerSec * 1000);
  await tx.game.update({
    where: { id: gameId },
    data: {
      currentStep: nextStep,
      competitiveStepDeadlineAt: nextDeadline,
    },
  });

  return true;
}

export async function reconcileCompetitiveGame(gameId: string): Promise<void> {
  let i = 0;
  while (i++ < 24) {
    const progressed = await prisma.$transaction((tx) => tryAdvanceCompetitiveRound(tx, gameId));
    if (!progressed) break;
  }
}

export async function createCompetitiveRoom(params: {
  hostGuestId: string;
  displayName: string;
}): Promise<{ roomId: string }> {
  const room = await prisma.room.create({
    data: {
      hostGuestId: params.hostGuestId,
      mode: "COMPETITIVE",
      state: RoomState.LOBBY,
      selectedSets: [],
      timerPerStepSeconds: 90,
    },
  });
  await prisma.roomPlayer.create({
    data: {
      roomId: room.id,
      guestId: params.hostGuestId,
      displayName: params.displayName.trim() || "Host",
      isHost: true,
      isConnected: true,
    },
  });
  return { roomId: room.id };
}

export async function joinCompetitiveRoom(params: {
  roomId: string;
  guestId: string;
  displayName: string;
}): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room || room.mode !== "COMPETITIVE") {
    throw new CompetitiveHttpError(404, "Room not found.");
  }
  if (room.state !== RoomState.LOBBY) {
    throw new CompetitiveHttpError(409, "Match already started.");
  }

  const existing = await prisma.roomPlayer.findFirst({
    where: { roomId: params.roomId, guestId: params.guestId, leftAt: null },
  });
  if (existing) {
    await prisma.roomPlayer.update({
      where: { id: existing.id },
      data: {
        displayName: params.displayName.trim() || existing.displayName,
        isConnected: true,
      },
    });
    return;
  }

  await prisma.roomPlayer.create({
    data: {
      roomId: params.roomId,
      guestId: params.guestId,
      displayName: params.displayName.trim() || "Rival",
      isHost: false,
      isConnected: true,
    },
  });
}

export async function updateCompetitiveSelectedSets(params: {
  roomId: string;
  hostGuestId: string;
  selectedSets: string[];
}): Promise<void> {
  await requireHost(params.roomId, params.hostGuestId);
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room || room.state !== RoomState.LOBBY) {
    throw new CompetitiveHttpError(409, "Sets can only be chosen in the lobby.");
  }
  await prisma.room.update({
    where: { id: params.roomId },
    data: { selectedSets: params.selectedSets },
  });
}

export async function updateCompetitiveTimer(params: {
  roomId: string;
  hostGuestId: string;
  timerPerStepSeconds: number;
}): Promise<void> {
  await requireHost(params.roomId, params.hostGuestId);
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room || room.state !== RoomState.LOBBY) {
    throw new CompetitiveHttpError(409, "Timer can only be set in the lobby.");
  }
  const t = Math.floor(params.timerPerStepSeconds);
  if (t < 15 || t > 600) {
    throw new CompetitiveHttpError(400, "Timer must be between 15 and 600 seconds.");
  }
  await prisma.room.update({
    where: { id: params.roomId },
    data: { timerPerStepSeconds: t },
  });
}

export async function startCompetitiveGame(params: {
  roomId: string;
  hostGuestId: string;
}): Promise<{ gameId: string }> {
  await requireHost(params.roomId, params.hostGuestId);

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    include: { roomPlayers: { where: { leftAt: null } } },
  });
  if (!room || room.mode !== "COMPETITIVE") {
    throw new CompetitiveHttpError(404, "Room not found.");
  }
  if (room.state !== RoomState.LOBBY) {
    throw new CompetitiveHttpError(409, "Game already started.");
  }
  if (room.roomPlayers.length < 2) {
    throw new CompetitiveHttpError(400, "Need at least two rivals.");
  }
  const timerSec = room.timerPerStepSeconds ?? 0;
  if (timerSec < 15) {
    throw new CompetitiveHttpError(400, "Set a step timer (15–600s) before starting.");
  }

  const catalogCard = getRandomCard(room.selectedSets);
  if (!catalogCard) {
    throw new CompetitiveHttpError(
      400,
      room.selectedSets.length > 0
        ? "No card in the catalog for those sets — adjust filters or clear them."
        : "No playable card found in the catalog.",
    );
  }
  const { revealCardKind, cardTemplateKey } = revealProfileFromFabCard(catalogCard.fabCard);
  const cardImageUrl = resolveFabCardArtUrl(catalogCard.imageUrl);

  const deadline = new Date(Date.now() + timerSec * 1000);

  const gameId = await prisma.$transaction(async (tx) => {
    const game = await tx.game.create({
      data: {
        roomId: room.id,
        mode: "COMPETITIVE",
        cardId: catalogCard.id,
        cardName: catalogCard.name,
        cardSet: catalogCard.setKey,
        cardImageUrl,
        revealSeed: newRevealSeed(),
        revealCardKind,
        cardTemplateKey,
        status: GameStatus.IN_PROGRESS,
        currentStep: 1,
        competitiveStepDeadlineAt: deadline,
      },
    });

    for (const rp of room.roomPlayers) {
      await tx.gamePlayer.create({
        data: {
          gameId: game.id,
          roomPlayerId: rp.id,
          guestId: rp.guestId,
          userId: rp.userId,
          displayName: rp.displayName,
          avatarId: rp.avatarId,
          competitiveState: CompetitivePlayerState.RACING,
        },
      });
    }

    await tx.room.update({
      where: { id: room.id },
      data: {
        state: RoomState.IN_PROGRESS,
        currentGameId: game.id,
      },
    });

    return game.id;
  });

  return { gameId };
}

export type CompetitiveGamePublic = {
  id: string;
  status: GameStatus;
  currentStep: number | null;
  totalSteps: number;
  cardId: string;
  cardImageUrl: string;
  revealSeed: string;
  currentImageUrl: string | null;
  revealCardKind: CardZoneValidityKind;
  cardTemplateKey: CardTemplateKey;
  cardName: string | null;
  dataSource: string | null;
  fabSet: string | null;
  competitiveStepDeadlineAt: string | null;
  timerPerStepSeconds: number | null;
  players: Array<{
    roomPlayerId: string;
    displayName: string;
    competitiveState: string | null;
    attemptCount: number;
    totalTimeMs: number;
    submittedThisStep: boolean;
    finalRank: number | null;
  }>;
  requesterRoomPlayerId: string;
  requesterIsHost: boolean;
  requesterCanSubmit: boolean;
  guesses: Array<{
    id: string;
    stepNumber: number;
    guessText: string;
    isCorrect: boolean;
    speakerDisplayName: string;
    createdAt: string;
  }>;
};

export type CompetitiveRoomPublic = {
  id: string;
  state: RoomState;
  selectedSets: string[];
  timerPerStepSeconds: number | null;
  requesterIsHost: boolean;
  players: Array<{
    id: string;
    displayName: string;
    isHost: boolean;
    isConnected: boolean;
  }>;
  game: CompetitiveGamePublic | null;
};

export async function getCompetitiveRoomPublic(params: {
  roomId: string;
  viewerGuestId: string;
}): Promise<CompetitiveRoomPublic> {
  const peek = await prisma.room.findUnique({
    where: { id: params.roomId },
    select: { mode: true, currentGameId: true },
  });
  if (!peek || peek.mode !== "COMPETITIVE") {
    throw new CompetitiveHttpError(404, "Room not found.");
  }
  if (peek.currentGameId) {
    await reconcileCompetitiveGame(peek.currentGameId);
  }

  const room = await prisma.room.findUniqueOrThrow({
    where: { id: params.roomId },
    include: {
      roomPlayers: { where: { leftAt: null }, orderBy: { joinedAt: "asc" } },
      currentGame: {
        include: {
          guesses: { orderBy: { createdAt: "asc" }, include: { gamePlayer: true } },
          gamePlayers: true,
        },
      },
    },
  });

  const self = room.roomPlayers.find((p) => p.guestId === params.viewerGuestId);
  if (!self) throw new CompetitiveHttpError(403, "Join this room first.");

  const players = room.roomPlayers.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    isHost: p.isHost,
    isConnected: p.isConnected,
  }));

  let gamePayload: CompetitiveGamePublic | null = null;
  const cg = room.currentGame;

  if (cg) {
    const resolved = resolveGameCard(cg as GameForCardResolution);
    const totalSteps = resolved.totalSteps;
    const heroArt = resolved.cardImageUrl;
    const stepNum = cg.currentStep ?? 1;
    const terminal =
      cg.status === GameStatus.WON ||
      cg.status === GameStatus.LOST ||
      cg.status === GameStatus.CANCELLED;

    const gpByRp = new Map(
      cg.gamePlayers.filter((g) => g.roomPlayerId).map((g) => [g.roomPlayerId!, g]),
    );
    const selfGp = gpByRp.get(self.id);

    const guessesThisStep = cg.guesses.filter((g) => g.stepNumber === stepNum);
    const submittedIds = new Set(guessesThisStep.map((g) => g.gamePlayerId));

    const racing = selfGp && isRacingState(selfGp.competitiveState);
    const requesterCanSubmit =
      cg.status === GameStatus.IN_PROGRESS &&
      !!racing &&
      !!selfGp &&
      !submittedIds.has(selfGp.id);

    const playerStats = await Promise.all(
      cg.gamePlayers.map(async (gp) => {
        const rpId = gp.roomPlayerId ?? "";
        const attempts = await prisma.guess.count({ where: { gamePlayerId: gp.id } });
        const sum = await prisma.guess.aggregate({
          where: { gamePlayerId: gp.id },
          _sum: { timeTakenMs: true },
        });
        const submittedThisStep =
          cg.status === GameStatus.IN_PROGRESS
            ? cg.guesses.some((g) => g.gamePlayerId === gp.id && g.stepNumber === stepNum)
            : false;
        return {
          roomPlayerId: rpId,
          displayName: gp.displayName,
          competitiveState: gp.competitiveState,
          attemptCount: attempts,
          totalTimeMs: sum._sum.timeTakenMs ?? 0,
          submittedThisStep,
          finalRank: gp.finalRank,
        };
      }),
    );

    gamePayload = {
      id: cg.id,
      status: cg.status,
      currentStep: cg.currentStep,
      totalSteps,
      cardId: cg.cardId,
      cardImageUrl: heroArt,
      revealSeed: resolved.seed,
      currentImageUrl: heroArt,
      revealCardKind: resolved.revealCardKind,
      cardTemplateKey: resolved.cardTemplateKey,
      cardName: terminal ? resolved.cardName : null,
      dataSource: terminal ? resolved.dataSource : null,
      fabSet: terminal ? resolved.fabSet : null,
      competitiveStepDeadlineAt: cg.competitiveStepDeadlineAt?.toISOString() ?? null,
      timerPerStepSeconds: room.timerPerStepSeconds,
      players: playerStats,
      requesterRoomPlayerId: self.id,
      requesterIsHost: self.isHost,
      requesterCanSubmit,
      guesses: cg.guesses.map((g) => ({
        id: g.id,
        stepNumber: g.stepNumber,
        guessText: g.guessText,
        isCorrect: g.isCorrect,
        speakerDisplayName: g.gamePlayer.displayName,
        createdAt: g.createdAt.toISOString(),
      })),
    };
  }

  return {
    id: room.id,
    state: room.state,
    selectedSets: room.selectedSets,
    timerPerStepSeconds: room.timerPerStepSeconds,
    requesterIsHost: self.isHost,
    players,
    game: gamePayload,
  };
}

export async function submitCompetitiveGuess(params: {
  gameId: string;
  guestId: string;
  guessText: string;
  timeTakenMs: number;
}): Promise<{ ok: true }> {
  const normalized = normalizeGuessText(params.guessText);
  if (!normalized) {
    throw new CompetitiveHttpError(400, "Speak a name, not silence.");
  }

  await reconcileCompetitiveGame(params.gameId);

  await prisma.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: params.gameId },
      include: {
        room: { include: { roomPlayers: { where: { leftAt: null } } } },
        gamePlayers: true,
      },
    });

    if (!game || game.mode !== "COMPETITIVE") {
      throw new CompetitiveHttpError(404, "Game not found.");
    }
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new CompetitiveHttpError(409, "This match already ended.");
    }
    if (!game.roomId || !game.room) throw new CompetitiveHttpError(500, "Room missing.");

    const rp = game.room.roomPlayers.find((p) => p.guestId === params.guestId);
    if (!rp) throw new CompetitiveHttpError(403, "Not in this room.");

    const gp = game.gamePlayers.find((g) => g.roomPlayerId === rp.id);
    if (!gp) throw new CompetitiveHttpError(500, "Game player missing.");

    if (!isRacingState(gp.competitiveState)) {
      throw new CompetitiveHttpError(409, "You already finished this race.");
    }

    const stepNum = game.currentStep ?? 1;
    const prior = await tx.guess.findFirst({
      where: { gameId: game.id, gamePlayerId: gp.id, stepNumber: stepNum },
    });
    if (prior) {
      throw new CompetitiveHttpError(409, "You already sealed a guess for this step.");
    }

    const resolved = resolveGameCard(game as GameForCardResolution);
    const cardNorm = normalizeGuessText(resolved.cardName);
    const isCorrect = guessesAreEqual(normalized, cardNorm);

    await tx.guess.create({
      data: {
        gameId: game.id,
        gamePlayerId: gp.id,
        stepNumber: stepNum,
        guessText: params.guessText.trim(),
        normalizedGuessText: normalized,
        isCorrect,
        timeTakenMs: Math.max(0, params.timeTakenMs),
        submittedByHostOverride: false,
      },
    });
  });

  await reconcileCompetitiveGame(params.gameId);

  return { ok: true };
}

export async function leaveCompetitiveRoom(params: {
  roomId: string;
  guestId: string;
}): Promise<void> {
  const rp = await requireRoomPlayer(params.roomId, params.guestId);
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room) return;
  if (rp.isHost && room.state === RoomState.LOBBY) {
    await prisma.room.update({
      where: { id: params.roomId },
      data: { state: RoomState.ABANDONED },
    });
    await prisma.roomPlayer.updateMany({
      where: { roomId: params.roomId, leftAt: null },
      data: { leftAt: new Date() },
    });
    return;
  }
  await prisma.roomPlayer.update({
    where: { id: rp.id },
    data: { leftAt: new Date() },
  });
}
