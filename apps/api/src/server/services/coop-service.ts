import { GameStatus, RoomState } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { guessesAreEqual, normalizeGuessText } from "@/lib/game/guess-normalize";
import { resolveFabCardArtUrl } from "@/lib/card-art-url";
import { revealProfileFromFabCard } from "@/lib/fab-reveal-profile";
import { newRevealSeed, resolveGameCard, type GameForCardResolution } from "@/lib/game-card-resolution";
import { nextActiveRoomPlayerId, shuffleRoomPlayerIds } from "@/server/engines/coop-engine";
import type { CardTemplateKey, CardZoneValidityKind } from "@gac/shared/reveal";
import { notifyCoopRoom } from "@/server/realtime/coop-notify";
import { getRandomCard } from "@/server/services/card-catalog-service";

export class CoopHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "CoopHttpError";
  }
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
  cardId: string;
  cardImageUrl: string;
  revealSeed: string;
  currentImageUrl: string | null;
  revealCardKind: CardZoneValidityKind;
  cardTemplateKey: CardTemplateKey;
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
    notifyCoopRoom(params.roomId);
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
  notifyCoopRoom(params.roomId);
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
  notifyCoopRoom(params.roomId);
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
  notifyCoopRoom(params.roomId);
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
  if (room.roomPlayers.length < 2) {
    throw new CoopHttpError(
      400,
      "Bind at least two seers before raising the veil — share the circle link and wait for another soul.",
    );
  }
  const catalogCard = getRandomCard(room.selectedSets);
  if (!catalogCard) {
    throw new CoopHttpError(
      400,
      room.selectedSets.length > 0
        ? "No card in the catalog for those sets — try another selection or clear filters."
        : "No playable card availed itself from the catalog.",
    );
  }
  const { revealCardKind, cardTemplateKey } = revealProfileFromFabCard(catalogCard.fabCard);
  const cardImageUrl = resolveFabCardArtUrl(catalogCard.imageUrl);

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
        cardId: catalogCard.id,
        cardName: catalogCard.name,
        cardSet: catalogCard.setKey,
        cardImageUrl,
        revealSeed: newRevealSeed(),
        revealCardKind,
        cardTemplateKey,
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

  notifyCoopRoom(params.roomId);
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
    const resolved = resolveGameCard(cg as GameForCardResolution);
    const totalSteps = resolved.totalSteps;
    const heroArt = resolved.cardImageUrl;
    const terminal =
      cg.status === GameStatus.WON ||
      cg.status === GameStatus.LOST ||
      cg.status === GameStatus.CANCELLED;

    const activeRp = cg.activeTurnRoomPlayerId
      ? room.roomPlayers.find((p) => p.id === cg.activeTurnRoomPlayerId)
      : null;

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
      cardId: cg.cardId,
      cardImageUrl: heroArt,
      revealSeed: resolved.seed,
      currentImageUrl: heroArt,
      revealCardKind: resolved.revealCardKind,
      cardTemplateKey: resolved.cardTemplateKey,
      cardName: terminal ? resolved.cardName : null,
      dataSource: terminal ? resolved.dataSource : null,
      fabSet: terminal ? resolved.fabSet : null,
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

    const resolved = resolveGameCard(game as GameForCardResolution);
    const totalSteps = resolved.totalSteps;
    const cardNorm = normalizeGuessText(resolved.cardName);
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
    };
  });

  notifyCoopRoom(txResult.roomId);
  return { correct: txResult.correct, status: txResult.status };
}

export async function leaveCoopRoom(params: { roomId: string; guestId: string }): Promise<void> {
  const leaver = await prisma.roomPlayer.findFirst({
    where: { roomId: params.roomId, guestId: params.guestId, leftAt: null },
  });
  if (!leaver) throw new CoopHttpError(403, "You are not part of this circle.");

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    include: {
      roomPlayers: { where: { leftAt: null } },
      currentGame: true,
    },
  });
  if (!room || room.mode !== "COOP") throw new CoopHttpError(404, "Circle not found.");

  const othersBefore = room.roomPlayers.filter((p) => p.id !== leaver.id);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (leaver.isHost && othersBefore.length > 0) {
      const promoted = [...othersBefore].sort(
        (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
      )[0]!;
      await tx.roomPlayer.update({
        where: { id: promoted.id },
        data: { isHost: true },
      });
      await tx.room.update({
        where: { id: room.id },
        data: {
          hostGuestId: promoted.guestId,
          hostUserId: promoted.userId,
        },
      });
    }

    await tx.roomPlayer.update({
      where: { id: leaver.id },
      data: { leftAt: now, isConnected: false, isHost: false },
    });

    if (othersBefore.length === 0) {
      await tx.room.update({
        where: { id: room.id },
        data: { state: RoomState.ABANDONED },
      });
      if (room.currentGameId) {
        await tx.game.update({
          where: { id: room.currentGameId },
          data: { status: GameStatus.CANCELLED, finishedAt: now },
        });
      }
      return;
    }

    if (!room.currentGameId) return;

    const game = await tx.game.findUnique({
      where: { id: room.currentGameId },
    });
    if (!game || game.status !== GameStatus.IN_PROGRESS) return;

    if (othersBefore.length < 2) {
      await tx.game.update({
        where: { id: game.id },
        data: { status: GameStatus.CANCELLED, finishedAt: now },
      });
      await tx.room.update({
        where: { id: room.id },
        data: { state: RoomState.FINISHED },
      });
      return;
    }

    if (game.activeTurnRoomPlayerId === leaver.id) {
      const ordered = othersBefore
        .filter((p) => p.turnOrder != null)
        .sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0));
      const nextId =
        ordered.length > 0 ? nextActiveRoomPlayerId(ordered, leaver.id) : null;
      await tx.game.update({
        where: { id: game.id },
        data: { activeTurnRoomPlayerId: nextId },
      });
    }
  });

  notifyCoopRoom(params.roomId);
}

export async function hostEndCoopGame(params: { roomId: string; hostGuestId: string }): Promise<void> {
  await requireHost(params.roomId, params.hostGuestId);

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    include: { currentGame: true },
  });
  if (!room?.currentGameId) {
    throw new CoopHttpError(409, "No active game in this circle.");
  }
  const g = room.currentGame;
  if (!g || g.status !== GameStatus.IN_PROGRESS) {
    throw new CoopHttpError(409, "The game is already over.");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: g.id },
      data: { status: GameStatus.CANCELLED, finishedAt: now },
    });
    await tx.room.update({
      where: { id: params.roomId },
      data: { state: RoomState.FINISHED },
    });
  });

  notifyCoopRoom(params.roomId);
}

/** After a terminal game, host may close the circle; all clients should treat the room as dismissed (see `ABANDONED`). */
export async function dismissCoopCircleByHostAfterGame(params: {
  roomId: string;
  hostGuestId: string;
}): Promise<void> {
  await requireHost(params.roomId, params.hostGuestId);

  const room = await prisma.room.findUnique({
    where: { id: params.roomId },
    include: { currentGame: true },
  });
  if (!room || room.mode !== "COOP") throw new CoopHttpError(404, "Circle not found.");
  if (room.state === RoomState.ABANDONED) {
    notifyCoopRoom(params.roomId);
    return;
  }

  const g = room.currentGame;
  if (!g) throw new CoopHttpError(409, "Nothing to dismiss yet.");
  const terminal =
    g.status === GameStatus.WON ||
    g.status === GameStatus.LOST ||
    g.status === GameStatus.CANCELLED;
  if (!terminal) {
    throw new CoopHttpError(409, "The ritual must finish before closing the circle.");
  }

  await prisma.room.update({
    where: { id: params.roomId },
    data: { state: RoomState.ABANDONED },
  });
  notifyCoopRoom(params.roomId);
}
