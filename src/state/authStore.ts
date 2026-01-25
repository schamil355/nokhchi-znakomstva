import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { Profile, Gender } from "../types";
import { usePreferencesStore } from "./preferencesStore";

const derivePreferredGenders = (userGender?: Gender | null): Gender[] => {
  if (userGender === "male") {
    return ["female"];
  }
  if (userGender === "female") {
    return ["male"];
  }
  return ["female", "male"];
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  verifiedOverride: boolean;
  authNotice: { type: "confirm_failed"; inAppBrowser?: boolean } | { type: "network_error" } | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthNotice: (notice: { type: "confirm_failed"; inAppBrowser?: boolean } | { type: "network_error" } | null) => void;
  clearAuthNotice: () => void;
  markVerified: () => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: false,
  verifiedOverride: false,
  authNotice: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => {
    const genders = derivePreferredGenders(profile?.gender);
    usePreferencesStore.getState().setFilters({ genders });
    set((state) => ({
      profile,
      verifiedOverride: profile?.verified ? true : state.verifiedOverride
    }));
  },
  setLoading: (isLoading) => set({ isLoading }),
  setAuthNotice: (authNotice) => set({ authNotice }),
  clearAuthNotice: () => set({ authNotice: null }),
  markVerified: () =>
    set((state) => ({
      profile: state.profile
        ? {
          ...state.profile,
          verified: true,
            verifiedAt: state.profile.verifiedAt ?? new Date().toISOString()
          }
        : state.profile,
      verifiedOverride: true
    })),
  reset: () =>
    set({
      session: null,
      profile: null,
      isLoading: false,
      verifiedOverride: false,
      authNotice: null
    })
}));
