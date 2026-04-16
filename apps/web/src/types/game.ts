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
  /** Catalog printing id for the dealt card. */
  cardId: string;
  cardName: string;
  /** Always `fab` for catalog-backed games. */
  dataSource: string;
  /** FAB catalog set code when present. */
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
