import { create } from "zustand";
import { Intention, Gender } from "../types";

export type GeoRegion = "chechnya" | "russia" | "europe" | "other";
const MAX_DISTANCE_KM = 130;

export type DiscoveryFilters = {
  genders: Gender[];
  intentions: Intention[];
  ageRange: [number, number];
  minDistanceKm: number;
  distanceKm: number;
  autoExtendDistance: boolean;
  region: GeoRegion;
  extendedBy?: number;
};

type PreferencesState = {
  filters: DiscoveryFilters;
  userFilters: Record<string, DiscoveryFilters>;
  activeUserId: string | null;
  setActiveUser: (userId: string | null) => void;
  setFilters: (filters: Partial<DiscoveryFilters>) => void;
  resetFilters: () => void;
};

const createDefaultFilters = (): DiscoveryFilters => ({
  genders: ["female", "male"],
  intentions: ["serious", "casual", "friendship"],
  ageRange: [18, 45],
  minDistanceKm: 0,
  distanceKm: MAX_DISTANCE_KM,
  autoExtendDistance: false,
  region: "chechnya",
  extendedBy: 0
});

const clampFilters = (current: DiscoveryFilters, partial: Partial<DiscoveryFilters>): DiscoveryFilters => ({
  ...current,
  ...partial,
  distanceKm: Math.min(partial.distanceKm ?? current.distanceKm, MAX_DISTANCE_KM),
  extendedBy: partial.extendedBy ?? current.extendedBy
});

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  filters: createDefaultFilters(),
  userFilters: {},
  activeUserId: null,
  setActiveUser: (userId) => {
    if (!userId) {
      set({ activeUserId: null, filters: createDefaultFilters() });
      return;
    }
    const existing = get().userFilters[userId];
    set({
      activeUserId: userId,
      filters: existing ? { ...existing } : createDefaultFilters()
    });
  },
  setFilters: (partial) =>
    set((state) => {
      const nextFilters = clampFilters(state.filters, partial);
      const userFilters = state.activeUserId
        ? { ...state.userFilters, [state.activeUserId]: nextFilters }
        : state.userFilters;
      return { filters: nextFilters, userFilters };
    }),
  resetFilters: () =>
    set((state) => {
      const base = createDefaultFilters();
      const userFilters =
        state.activeUserId && state.userFilters[state.activeUserId]
          ? { ...state.userFilters, [state.activeUserId]: base }
          : state.userFilters;
      return {
        filters: base,
        userFilters
      };
    })
}));
