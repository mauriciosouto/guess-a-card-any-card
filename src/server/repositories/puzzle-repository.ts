import type { Puzzle, PuzzleStep } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type PuzzleWithSteps = Puzzle & { steps: PuzzleStep[] };

/** Game client only serves Flesh and Blood puzzles authored under this `Puzzle.dataSource`. */
export const FAB_GAME_DATA_SOURCE = "fab";

const playableFabBaseWhere = {
  dataSource: FAB_GAME_DATA_SOURCE,
  isActive: true,
  savedAt: { not: null },
} as const;

/**
 * Distinct non-null `Puzzle.fabSet` values for playable FAB puzzles (dropdown / lobby filters).
 */
export async function listActiveFabSetNames(): Promise<string[]> {
  const rows = await prisma.puzzle.findMany({
    where: {
      ...playableFabBaseWhere,
      fabSet: { not: null },
    },
    select: { fabSet: true },
    distinct: ["fabSet"],
    orderBy: { fabSet: "asc" },
  });
  const names = rows
    .map((r) => r.fabSet?.trim())
    .filter((s): s is string => Boolean(s));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export type HostKey =
  | { hostUserId: string; hostGuestId?: undefined }
  | { hostGuestId: string; hostUserId?: undefined };

export async function listRecentPuzzleIdsForHost(
  host: HostKey,
  limit = 50,
): Promise<string[]> {
  const where =
    "hostUserId" in host && host.hostUserId
      ? { hostUserId: host.hostUserId }
      : "hostGuestId" in host && host.hostGuestId
        ? { hostGuestId: host.hostGuestId }
        : null;

  if (!where) return [];

  const rows = await prisma.hostPuzzleHistory.findMany({
    where,
    orderBy: { lastPlayedAt: "desc" },
    take: limit,
    select: { puzzleId: true },
  });

  return [...new Set(rows.map((r) => r.puzzleId))];
}

type PickPuzzleParams = {
  /**
   * When non-empty, only puzzles whose `fabSet` is in this list (union).
   * When empty, any playable FAB puzzle (`dataSource === fab`), including rows with `fabSet` null.
   */
  fabSets: string[];
  excludePuzzleIds: string[];
};

/**
 * Random playable FAB puzzle, optionally restricted by `fabSet`, optionally excluding recent ids.
 */
export async function pickRandomPuzzle(
  params: PickPuzzleParams,
): Promise<PuzzleWithSteps | null> {
  const fabFilter =
    params.fabSets.length > 0
      ? { fabSet: { in: params.fabSets } as const }
      : {};

  const baseWhere = {
    ...playableFabBaseWhere,
    ...fabFilter,
  } as const;

  async function tryPick(
    exclude: string[],
  ): Promise<PuzzleWithSteps | null> {
    const where =
      exclude.length > 0
        ? { ...baseWhere, id: { notIn: exclude } }
        : baseWhere;

    const count = await prisma.puzzle.count({ where });
    if (count === 0) return null;

    const skip = Math.floor(Math.random() * count);
    return prisma.puzzle.findFirst({
      where,
      skip,
      include: { steps: { orderBy: { step: "asc" } } },
    });
  }

  const first = await tryPick(params.excludePuzzleIds);
  if (first) return first;

  if (params.excludePuzzleIds.length > 0) {
    return tryPick([]);
  }

  return null;
}

export async function recordHostPuzzlePlayed(
  host: HostKey,
  puzzleId: string,
): Promise<void> {
  const data =
    "hostUserId" in host && host.hostUserId
      ? { hostUserId: host.hostUserId, hostGuestId: null as string | null }
      : "hostGuestId" in host && host.hostGuestId
        ? { hostUserId: null as string | null, hostGuestId: host.hostGuestId }
        : null;

  if (!data) return;

  await prisma.hostPuzzleHistory.create({
    data: {
      puzzleId,
      hostUserId: data.hostUserId,
      hostGuestId: data.hostGuestId,
    },
  });
}
