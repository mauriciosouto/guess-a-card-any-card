import { create } from "zustand";
import type { RuntimeGameState } from "@/types/game";

type GameStore = {
  currentGame: RuntimeGameState | null;
  currentStepImageUrl: string | null;
  setCurrentGame: (g: RuntimeGameState | null) => void;
  setCurrentStepImageUrl: (url: string | null) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  currentGame: null,
  currentStepImageUrl: null,
  setCurrentGame: (currentGame) => set({ currentGame }),
  setCurrentStepImageUrl: (currentStepImageUrl) => set({ currentStepImageUrl }),
}));
