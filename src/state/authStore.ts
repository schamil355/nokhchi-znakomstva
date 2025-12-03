import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { Profile, Gender } from "../types";
import { usePreferencesStore } from "./preferencesStore";

const derivePreferredGenders = (userGender?: Gender | null): Gender[] => {
  if (userGender === "male") return ["female"];
  if (userGender === "female") return ["male"];
  // Fallback: allow all if gender is unset/nonbinary/unknown
  return ["female", "male", "nonbinary"];
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  verifiedOverride: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  markVerified: () => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: false,
  verifiedOverride: false,
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
  reset: () => set({ session: null, profile: null, isLoading: false, verifiedOverride: false })
}));
