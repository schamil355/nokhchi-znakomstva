import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import { getSupabase } from "../../lib/supabase";
import { isRevenueCatConfigured } from "../../lib/revenuecat";
import { useSessionStore } from "../../store/sessionStore";
import { useEntitlements } from "./hooks";
import { useRegionOffering } from "../../lib/region";
import { getPurchasesApi } from "../../lib/revenuecat";

const isMobilePlatform = Platform.OS === "ios" || Platform.OS === "android";

type SyncReason = "login" | "foreground";

export const useEntitlementLifecycleSync = () => {
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const previousUserIdRef = useRef<string | null>(session?.user.id ?? null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const syncingRef = useRef(false);
  const lastSyncRef = useRef(0);

  const { refreshEntitlements } = useEntitlements();
  const { refetch: refetchRegion } = useRegionOffering();

  const runSync = useCallback(
    async (reason: SyncReason) => {
      const userId = session?.user.id;
      if (!userId) {
        return;
      }

      if (syncingRef.current) {
        return;
      }

      if (reason === "foreground") {
        const now = Date.now();
        if (now - lastSyncRef.current < 5_000) {
          return;
        }
      }

      syncingRef.current = true;

      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("refreshSession failed", error.message);
        }
        if (data?.session) {
          setSession(data.session);
        }

        if (isRevenueCatConfigured() && isMobilePlatform) {
          try {
            const Purchases = getPurchasesApi();
            if (Purchases) {
              await Purchases.syncPurchases();
            }
          } catch (syncError) {
            console.warn("Purchases.syncPurchases failed", syncError);
          }
        }

        await refreshEntitlements({ trigger: reason });
        await refetchRegion();
        lastSyncRef.current = Date.now();
      } catch (error) {
        console.warn("Entitlement sync failed", error);
      } finally {
        syncingRef.current = false;
      }
    },
    [refetchRegion, refreshEntitlements, session?.user.id, setSession],
  );

  useEffect(() => {
    const currentUserId = session?.user.id ?? null;
    if (currentUserId && previousUserIdRef.current !== currentUserId) {
      previousUserIdRef.current = currentUserId;
      runSync("login").catch((error) =>
        console.warn("Login entitlement sync failed", error),
      );
      return;
    }

    if (!currentUserId) {
      previousUserIdRef.current = null;
    }
  }, [runSync, session?.user.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current?.match(/inactive|background/) && nextState === "active") {
        runSync("foreground").catch((error) =>
          console.warn("Foreground entitlement sync failed", error),
        );
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [runSync]);
};
