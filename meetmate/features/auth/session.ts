import { useEffect } from "react";
import { getSupabase } from "../../lib/supabase";
import { useSessionStore } from "../../store/sessionStore";

export const useSupabaseAuthSync = () => {
  const setSession = useSessionStore((state) => state.setSession);
  const markHydrated = useSessionStore((state) => state.markHydrated);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session ?? null);
      markHydrated();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [markHydrated, setSession]);
};
