import { create } from "zustand";
import { Intention, Gender } from "../types";

export type DiscoveryFilters = {
  genders: Gender[];
  intentions: Intention[];
  ageRange: [number, number];
  distanceKm: number;
};

type PreferencesState = {
  filters: DiscoveryFilters;
  setFilters: (filters: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
};

const defaultFilters: DiscoveryFilters = {
  genders: ["female", "male", "nonbinary"],
  intentions: ["serious", "casual", "friendship"],
  ageRange: [18, 45],
  distanceKm: 50
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  filters: defaultFilters,
  setFilters: (partial) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...partial
      }
    })),
  resetFilters: () => set({ filters: defaultFilters })
}));
