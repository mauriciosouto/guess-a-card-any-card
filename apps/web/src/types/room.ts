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
  /** Selected FAB release names in lobby; empty = any set (full pool at deal time). */
  selectedSets: string[];
  timerPerStepSeconds?: number | null;
};
