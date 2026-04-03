import { GameStatus, RoomState } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { guessesAreEqual, normalizeGuessText } from "@/lib/game/guess-normalize";
import { resolveStepImageUrl } from "@/lib/game/puzzle-step-image";
import { nextActiveRoomPlayerId, shuffleRoomPlayerIds } from "@/server/engines/coop-engine";
import type { HostKey } from "@/server/repositories/puzzle-repository";
import {
  notifyPuzzleCompletedForHost,
  resolvePuzzleForNewGame,
} from "@/server/services/puzzle-service";

export class CoopHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "CoopHttpError";
  }
}

function asHostKey(room: { hostUserId: string | null; hostGuestId: string | null }): HostKey | null {
  if (room.hostUserId) return { hostUserId: room.hostUserId };
  if (room.hostGuestId) return { hostGuestId: room.hostGuestId };
  return null;
}

export type CoopGuessLine = {
  id: string;
  stepNumber: number;
  guessText: string;
  isCorrect: boolean;
  submittedByHostOverride: boolean;
  speakerDisplayName: string;
  createdAt: string;
};

export type CoopGamePublic = {
  id: string;
  status: GameStatus;
  currentStep: number | null;
  totalSteps: number;
  cardImageUrl: string;
  puzzleSeed: string;
  currentImageUrl: string | null;
  cardName: string | null;
  dataSource: string | null;
  fabSet: string | null;
  activeTurnRoomPlayerId: string | null;
  activePlayerDisplayName: string | null;
  attemptCount: number;
  guesses: CoopGuessLine[];
  requesterRoomPlayerId: string;
  requesterIsHost: boolean;
  requesterCanSubmit: boolean;
  requesterCanHostOverride: boolean;
};

export type CoopRoomPublic = {
  id: string;
  state: RoomState;
  selectedSets: string[];
  requesterIsHost: boolean;
  players: Array<{
    id: string;
    displayName: string;
    isHost: boolean;
    turnOrder: number | null;
    isConnected: boolean;
  }>;
  game: CoopGamePublic | null;
};

async function requireRoomPlayer(roomId: string, guestId: string) {
  const rp = await prisma.roomPlayer.findFirst({
    where: { roomId, guestId, leftAt: null },
  });
  if (!rp) throw new CoopHttpError(403, "You are not part of this circle.");
  return rp;
}

async function requireHost(roomId: string, guestId: string) {
  const rp = await requireRoomPlayer(roomId, guestId);
  if (!rp.isHost) throw new CoopHttpError(403, "Only the host may do that.");
  return rp;
}

export async function createCoopRoom(params: {
  hostGuestId: string;
  displayName: string;
}): Promise<{ roomId: string }> {
  const room = await prisma.room.create({
    data: {
      hostGuestId: params.hostGuestId,
      mode: "COOP",
      state: "LOBBY",
      selectedSets: [],
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

export async function joinCoopRoom(params: {
  roomId: string;
  guestId: string;
  displayName: string;
}): Promise<void> {
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room || room.mode !== "COOP") throw new CoopHttpError(404, "Circle not found.");
  if (room.state !== "LOBBY") {
    throw new CoopHttpError(409, "The ritual already began — this circle is closed to newcomers.");
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
      displayName: params.displayName.trim() || "Seer",
      isHost: false,
      isConnected: true,
    },
  });
}

export async function updateCoopSelectedSets(params: {
  roomId: string;
  hostGuestId: string;
  selectedSets: string[];
}): Promise<void> {
  await requireHost(params.roomId, params.hostGuestId);
  const room = await prisma.room.findUnique({ where: { id: params.roomId } });
  if (!room || room.state !== "LOBBY") {
    throw new CoopHttpError(409, "Sets can only be chosen before the veil lifts.");
  }
  await prisma.room.update({
    where: { id: params.roomId },
    data: { selectedSets: params.selectedSets },
  });
}

export async function setCoopPlayerConnected(params: {
  roomId: string;
  hostGuestId: string;
  targetRoomPlayerId: string;
  isConnected: boolean;
}): Promise<void> {
  const host = await requireHost(params.roomId, params.hostGuestId);
  const target = await prisma.roomPlayer.findFirst({
    where: { id: params.targetRoomPlayerId, roomId: params.roomId, leftAt: null },
  });
  if (!target) throw new CoopHttpError(404, "Seer not found.");
  if (target.id === host.id) {
    throw new CoopHttpError(400, "The host cannot be marked absent.");
  }
  await prisma.roomPlayer.update({
    where: { id: target.id },
    data: { isConnected: params.isConnected },
  });
}

export async function startCoopGame(params: {
  roomId: string;
  hostGuestId: string;
}): Promise<{ gameId: string }> {
  await requireHost(params.roomId, params.hostGuestId);

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    include: {
      roomPlayers: { where: { leftAt: null } },
    },
  });

  if (!room || room.mode !== "COOP") throw new CoopHttpError(404, "Circle not found.");
  if (room.state !== "LOBBY") throw new CoopHttpError(409, "A game already binds this room.");
  if (room.roomPlayers.length === 0) throw new CoopHttpError(400, "No seers at the table.");
  const hostKey = asHostKey(room);
  const puzzle = await resolvePuzzleForNewGame({
    selectedFabSets: room.selectedSets,
    host: hostKey,
    recentHistoryLimit: 50,
  });
  if (!puzzle) {
    throw new CoopHttpError(
      400,
      room.selectedSets.length > 0
        ? "No puzzle availed itself for those FAB sets — try another selection or clear filters."
        : "No playable FAB puzzle availed itself.",
    );
  }

  const orderedSteps = [...puzzle.steps].sort((a, b) => a.step - b.step);
  if (orderedSteps.length === 0) {
    throw new CoopHttpError(400, "That omen has no steps yet.");
  }

  const shuffled = shuffleRoomPlayerIds(room.roomPlayers.map((p) => p.id));
  const firstActiveId = shuffled[0]!;

  const gameId = await prisma.$transaction(async (tx) => {
    for (let i = 0; i < shuffled.length; i++) {
      await tx.roomPlayer.update({
        where: { id: shuffled[i]! },
        data: { turnOrder: i },
      });
    }

    const game = await tx.game.create({
      data: {
        roomId: room.id,
        mode: "COOP",
        puzzleId: puzzle.id,
        status: GameStatus.IN_PROGRESS,
        currentStep: 1,
        activeTurnRoomPlayerId: firstActiveId,
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

function gamePlayerByRoomPlayer(
  gamePlayers: { id: string; roomPlayerId: string | null; displayName: string }[],
  roomPlayerId: string,
) {
  return gamePlayers.find((g) => g.roomPlayerId === roomPlayerId) ?? null;
}

export async function getCoopRoomPublic(params: {
  roomId: string;
  viewerGuestId: string;
}): Promise<CoopRoomPublic> {
  const self = await requireRoomPlayer(params.roomId, params.viewerGuestId);

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    include: {
      roomPlayers: {
        where: { leftAt: null },
        orderBy: [{ turnOrder: "asc" }, { joinedAt: "asc" }],
      },
      currentGame: {
        include: {
          puzzle: { include: { steps: { orderBy: { step: "asc" } } } },
          guesses: { orderBy: { createdAt: "asc" }, include: { gamePlayer: true } },
          gamePlayers: true,
        },
      },
    },
  });

  if (!room || room.mode !== "COOP") throw new CoopHttpError(404, "Circle not found.");

  const players = room.roomPlayers.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    isHost: p.isHost,
    turnOrder: p.turnOrder,
    isConnected: p.isConnected,
  }));

  let gamePayload: CoopGamePublic | null = null;
  const cg = room.currentGame;

  if (cg) {
    const orderedSteps = [...cg.puzzle.steps].sort((a, b) => a.step - b.step);
    const totalSteps = orderedSteps.length;
    const stepRow = orderedSteps[(cg.currentStep ?? 1) - 1];
    const terminal = cg.status === GameStatus.WON || cg.status === GameStatus.LOST;

    const activeRp = cg.activeTurnRoomPlayerId
      ? room.roomPlayers.find((p) => p.id === cg.activeTurnRoomPlayerId)
      : null;

    const imageUrl = stepRow
      ? resolveStepImageUrl(cg.puzzle, stepRow)
      : resolveStepImageUrl(cg.puzzle, orderedSteps[0] ?? null);

    const activeGp = cg.activeTurnRoomPlayerId
      ? gamePlayerByRoomPlayer(cg.gamePlayers, cg.activeTurnRoomPlayerId)
      : null;

    const canSubmit =
      cg.status === GameStatus.IN_PROGRESS &&
      cg.activeTurnRoomPlayerId === self.id &&
      self.isConnected;

    const activeDisconnected =
      !!cg.activeTurnRoomPlayerId &&
      !room.roomPlayers.find((p) => p.id === cg.activeTurnRoomPlayerId)?.isConnected;

    const canHostOverride =
      cg.status === GameStatus.IN_PROGRESS &&
      self.isHost &&
      activeDisconnected &&
      !!cg.activeTurnRoomPlayerId;

    gamePayload = {
      id: cg.id,
      status: cg.status,
      currentStep: cg.currentStep,
      totalSteps,
      cardImageUrl: cg.puzzle.imageUrl,
      puzzleSeed: cg.puzzle.seed,
      currentImageUrl: terminal
        ? resolveStepImageUrl(cg.puzzle, orderedSteps[totalSteps - 1]!)
        : imageUrl,
      cardName: terminal ? cg.puzzle.cardName : null,
      dataSource: terminal ? cg.puzzle.dataSource : null,
      fabSet: terminal ? cg.puzzle.fabSet : null,
      activeTurnRoomPlayerId: cg.activeTurnRoomPlayerId,
      activePlayerDisplayName: activeGp?.displayName ?? activeRp?.displayName ?? null,
      attemptCount: cg.guesses.length,
      guesses: cg.guesses.map((g) => ({
        id: g.id,
        stepNumber: g.stepNumber,
        guessText: g.guessText,
        isCorrect: g.isCorrect,
        submittedByHostOverride: g.submittedByHostOverride,
        speakerDisplayName: g.gamePlayer.displayName,
        createdAt: g.createdAt.toISOString(),
      })),
      requesterRoomPlayerId: self.id,
      requesterIsHost: self.isHost,
      requesterCanSubmit: canSubmit || canHostOverride,
      requesterCanHostOverride: canHostOverride,
    };
  }

  return {
    id: room.id,
    state: room.state,
    selectedSets: room.selectedSets,
    requesterIsHost: self.isHost,
    players,
    game: gamePayload,
  };
}

type GuessTxResult = {
  correct: boolean;
  status: GameStatus;
  roomId: string;
  puzzleId: string;
};

export async function submitCoopGuess(params: {
  gameId: string;
  submitterGuestId: string;
  guessText: string;
  timeTakenMs: number;
}): Promise<{ correct: boolean; status: GameStatus }> {
  const normalized = normalizeGuessText(params.guessText);
  if (!normalized) throw new CoopHttpError(400, "Speak a name, not silence.");

  const txResult = await prisma.$transaction(async (tx): Promise<GuessTxResult> => {
    const game = await tx.game.findUnique({
      where: { id: params.gameId },
      include: {
        puzzle: { include: { steps: { orderBy: { step: "asc" } } } },
        room: { include: { roomPlayers: { where: { leftAt: null } } } },
        guesses: true,
        gamePlayers: true,
      },
    });

    if (!game || game.mode !== "COOP") throw new CoopHttpError(404, "Game not found.");
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new CoopHttpError(409, "That thread is already cut.");
    }
    if (!game.roomId || !game.room) throw new CoopHttpError(500, "Room missing from game.");

    const roomRow = game.room;

    const submitter = await tx.roomPlayer.findFirst({
      where: { roomId: game.roomId, guestId: params.submitterGuestId, leftAt: null },
    });
    if (!submitter) throw new CoopHttpError(403, "You are not part of this circle.");

    const activeId = game.activeTurnRoomPlayerId;
    if (!activeId) throw new CoopHttpError(500, "No active turn.");

    const activeRp = roomRow.roomPlayers.find((p) => p.id === activeId);
    if (!activeRp) throw new CoopHttpError(500, "Active player missing.");

    const activeGp = gamePlayerByRoomPlayer(game.gamePlayers, activeId);
    if (!activeGp) throw new CoopHttpError(500, "Active game player missing.");

    let hostOverride = false;
    if (submitter.id === activeId) {
      if (!submitter.isConnected) {
        throw new CoopHttpError(403, "You are marked absent — the host must speak for you.");
      }
    } else if (submitter.isHost && !activeRp.isConnected) {
      hostOverride = true;
    } else {
      throw new CoopHttpError(403, "It is not your voice at this veil.");
    }

    const stepNum = game.currentStep ?? 1;
    const prior = await tx.guess.findFirst({
      where: { gameId: game.id, stepNumber: stepNum },
    });
    if (prior) throw new CoopHttpError(409, "A name was already spoken for this step.");

    const orderedSteps = [...game.puzzle.steps].sort((a, b) => a.step - b.step);
    const totalSteps = orderedSteps.length;
    const cardNorm = normalizeGuessText(game.puzzle.cardName);
    const correct = guessesAreEqual(normalized, cardNorm);

    await tx.guess.create({
      data: {
        gameId: game.id,
        gamePlayerId: activeGp.id,
        stepNumber: stepNum,
        guessText: params.guessText.trim(),
        normalizedGuessText: normalized,
        isCorrect: correct,
        timeTakenMs: Math.max(0, params.timeTakenMs),
        submittedByHostOverride: hostOverride,
      },
    });

    if (correct) {
      const attemptCount = game.guesses.length + 1;
      const totalTimeMs =
        game.guesses.reduce((s, g) => s + g.timeTakenMs, 0) + Math.max(0, params.timeTakenMs);

      await tx.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.WON,
          finishedAt: new Date(),
          winningAttemptCount: attemptCount,
          winningTotalTimeMs: totalTimeMs,
        },
      });

      await tx.gamePlayer.updateMany({
        where: { gameId: game.id },
        data: { didWin: true },
      });

      await tx.room.update({
        where: { id: game.roomId! },
        data: { state: RoomState.FINISHED },
      });

      return {
        correct: true,
        status: GameStatus.WON,
        roomId: game.roomId!,
        puzzleId: game.puzzleId,
      };
    }

    if (stepNum >= totalSteps) {
      await tx.game.update({
        where: { id: game.id },
        data: {
          status: GameStatus.LOST,
          finishedAt: new Date(),
        },
      });
      await tx.room.update({
        where: { id: game.roomId! },
        data: { state: RoomState.FINISHED },
      });
      return {
        correct: false,
        status: GameStatus.LOST,
        roomId: game.roomId!,
        puzzleId: game.puzzleId,
      };
    }

    const nextId = nextActiveRoomPlayerId(
      roomRow.roomPlayers.map((p) => ({ id: p.id, turnOrder: p.turnOrder })),
      activeId,
    );

    await tx.game.update({
      where: { id: game.id },
      data: {
        currentStep: stepNum + 1,
        activeTurnRoomPlayerId: nextId,
      },
    });

    return {
      correct: false,
      status: GameStatus.IN_PROGRESS,
      roomId: game.roomId!,
      puzzleId: game.puzzleId,
    };
  });

  if (txResult.status === GameStatus.WON || txResult.status === GameStatus.LOST) {
    const roomRow = await prisma.room.findUnique({ where: { id: txResult.roomId } });
    const hk = roomRow && asHostKey(roomRow);
    if (hk) {
      await notifyPuzzleCompletedForHost(hk, txResult.puzzleId).catch(() => {});
    }
  }

  return { correct: txResult.correct, status: txResult.status };
}
