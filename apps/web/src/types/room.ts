export type RoomState =
  | "LOBBY"
  | "COUNTDOWN"
  | "IN_PROGRESS"
  | "FINISHED"
  | "ABANDONED";

export type GameMode = "SINGLE" | "COMPETITIVE" | "COOP" | "CHALLENGE";

export type RoomSnapshot = {
  id: string;
  mode: GameMode;
  state: RoomState;
  /** Selected `Puzzle.fabSet` codes in lobby; empty = any FAB puzzle. */
  selectedSets: string[];
  timerPerStepSeconds?: number | null;
};
