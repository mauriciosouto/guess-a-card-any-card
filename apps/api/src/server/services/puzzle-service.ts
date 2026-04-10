import type { PuzzleWithSteps } from "@/server/repositories/puzzle-repository";
import {
  listActiveFabSetNames,
  listRecentPuzzleIdsForHost,
  pickRandomPuzzle,
  recordHostPuzzlePlayed,
  type HostKey,
} from "@/server/repositories/puzzle-repository";

export { FAB_GAME_DATA_SOURCE } from "@/server/repositories/puzzle-repository";
import { searchFabCatalogCardNames } from "@/server/services/fab-card-catalog";

export type { PuzzleWithSteps, HostKey };

/**
 * Domain-facing API for puzzle selection (read-only; puzzles are created in admin).
 */
/** Distinct `Puzzle.fabSet` codes for playable FAB puzzles (fixed `dataSource`; see {@link FAB_GAME_DATA_SOURCE}). */
export async function getAvailableSets(): Promise<string[]> {
  return listActiveFabSetNames();
}

export async function resolvePuzzleForNewGame(params: {
  /** Selected FAB set codes; empty = any playable FAB puzzle. */
  selectedFabSets: string[];
  host?: HostKey | null;
  /** How many recent puzzle ids to exclude when possible. */
  recentHistoryLimit?: number;
}): Promise<PuzzleWithSteps | null> {
  const host = params.host ?? null;
  const exclude = host
    ? await listRecentPuzzleIdsForHost(
        host,
        params.recentHistoryLimit ?? 50,
      )
    : [];

  return pickRandomPuzzle({
    fabSets: params.selectedFabSets,
    excludePuzzleIds: exclude,
  });
}

export async function notifyPuzzleCompletedForHost(
  host: HostKey,
  puzzleId: string,
): Promise<void> {
  await recordHostPuzzlePlayed(host, puzzleId);
}

/** Min 3 characters before API returns matches (callers may enforce). Uses @flesh-and-blood/cards. */
export async function findCardNameSuggestions(params: {
  query: string;
  limit?: number;
}): Promise<string[]> {
  return searchFabCatalogCardNames(params.query, params.limit ?? 20);
}
