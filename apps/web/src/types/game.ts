import type { GameMode } from "./room";

export type GameStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "WON"
  | "LOST"
  | "DRAW"
  | "CANCELLED";

export type PlayerRuntimeState = {
  playerId: string;
  displayName: string;
  avatarId?: string;
  isConnected: boolean;
  hasSubmittedCurrentStep: boolean;
  isSolved: boolean;
  solvedAtStep?: number;
  totalTimeMs: number;
  attemptsUsed: number;
};

export type RuntimeGameState = {
  gameId: string;
  roomId?: string;
  mode: GameMode;
  puzzleId: string;
  cardName: string;
  /** Always `fab` for puzzles served by this app; stored as `Puzzle.dataSource`. */
  dataSource: string;
  /** FAB catalog set code when set by admin; optional. */
  fabSet?: string | null;
  currentStep: number;
  totalSteps: number;
  status: "IN_PROGRESS" | "WON" | "LOST" | "FINISHED";
  players: PlayerRuntimeState[];
  activeTurnPlayerId?: string;
  stepDeadlineAt?: string;
  startedAt: string;
  finishedAt?: string;
};

/** Puzzle as stored in DB (admin + game columns). */
export type Puzzle = {
  id: string;
  dataSource: string;
  fabSet?: string | null;
  externalCardId: string;
  cardName: string;
  imageUrl: string;
  seed: string;
  isActive: boolean;
  savedAt: string | null;
  createdAt: string;
  steps: PuzzleStep[];
};

export type PuzzleStep = {
  step: number;
  imageUrl?: string | null;
  blur: number;
  brightness: number;
};
