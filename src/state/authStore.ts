import { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { Profile } from "../types";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ session: null, profile: null, isLoading: false })
}));
