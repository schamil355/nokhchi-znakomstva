import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type SessionState = {
  session: Session | null;
  user: User | null;
  isHydrated: boolean;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
  markHydrated: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isHydrated: false,
      setSession: (session) =>
        set({
          session,
          user: session?.user ?? null,
        }),
      clearSession: () =>
        set({
          session: null,
          user: null,
        }),
      markHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: "meetmate-session",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

export const selectSession = (state: SessionState) => state.session;
export const selectIsHydrated = (state: SessionState) => state.isHydrated;
