import type { GeoRegion } from "./geoRegion";

const REGION_STORAGE_KEY = "meetmate.region";

export const getStoredRegion = (): GeoRegion | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(REGION_STORAGE_KEY);
    if (!value) return null;
    if (value === "chechnya" || value === "russia" || value === "europe" || value === "other") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
};

export const setStoredRegion = (region: GeoRegion) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(REGION_STORAGE_KEY, region);
  } catch {
    // ignore storage errors
  }
};
