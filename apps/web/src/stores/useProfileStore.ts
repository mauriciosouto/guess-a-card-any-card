import { create } from "zustand";

type ProfileStore = {
  displayName: string | null;
  setDisplayName: (name: string | null) => void;
};

export const useProfileStore = create<ProfileStore>((set) => ({
  displayName: null,
  setDisplayName: (displayName) => set({ displayName }),
}));
