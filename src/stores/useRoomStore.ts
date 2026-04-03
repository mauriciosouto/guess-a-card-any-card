import { create } from "zustand";
import type { RoomSnapshot } from "@/types/room";

type RoomStore = {
  currentRoom: RoomSnapshot | null;
  setCurrentRoom: (r: RoomSnapshot | null) => void;
};

export const useRoomStore = create<RoomStore>((set) => ({
  currentRoom: null,
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
}));
