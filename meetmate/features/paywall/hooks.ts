import { useCallback, useEffect, useMemo, useState } from "react";
import type { CustomerInfo } from "react-native-purchases";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import { useSessionStore } from "../../store/sessionStore";
import { trackTelemetry } from "../../lib/telemetry";
import { getPurchasesApi } from "../../lib/revenuecat";

export type Entitlements = {
  unlimitedSwipes: boolean;
  dailyBoost: boolean;
  superLikes: number;
  expiresAt?: string | null;
  sources: string[];
};

export const defaultEntitlements: Entitlements = {
  unlimitedSwipes: false,
  dailyBoost: false,
  superLikes: 0,
  expiresAt: null,
  sources: [],
};

const ENTITLEMENT_IDS = {
  unlimitedSwipes: "unlimited_swipes",
  dailyBoost: "daily_boost",
  superLikes: "super_likes",
} as const;

export const mapRevenueCat = (info?: CustomerInfo | null): Entitlements => {
  if (!info) {
    return defaultEntitlements;
  }

  const active = info.entitlements?.active ?? {};
  const unlimited = Boolean(active[ENTITLEMENT_IDS.unlimitedSwipes]);
  const boost = Boolean(active[ENTITLEMENT_IDS.dailyBoost]);
  const superEntitlement = active[ENTITLEMENT_IDS.superLikes];
  const superTokensRaw =
    superEntitlement?.metadata?.tokens ?? superEntitlement?.metadata?.remaining ?? 0;
  const superLikes = Math.max(0, Number(superTokensRaw) || (superEntitlement ? 1 : 0));
  const expiresAt =
    superEntitlement?.expirationDate ??
    active[ENTITLEMENT_IDS.unlimitedSwipes]?.expirationDate ??
    null;

  const sources = new Set<string>();
  if (unlimited) {
    sources.add("unlimited");
    sources.add("unlimited:revenuecat");
  }
  if (boost) {
    sources.add("boost");
    sources.add("boost:revenuecat");
  }
  if (superLikes) {
    sources.add("super_likes");
    sources.add("super_likes:revenuecat");
  }

  Object.values(active).forEach((ent) => {
    if (ent.productIdentifier) {
      sources.add(ent.productIdentifier);
      sources.add(`${ent.productIdentifier}:revenuecat`);
    }
  });

  return {
    unlimitedSwipes: unlimited,
    dailyBoost: boost,
    superLikes,
    expiresAt,
    sources: Array.from(sources),
  };
};

type ServerEntitlement = {
  product_id: string;
  source: string;
  period_end: string;
};

const isServerEntitlementActive = (ent: ServerEntitlement) => {
  if (!ent.period_end) return false;
  return new Date(ent.period_end) > new Date();
};

export const mergeEntitlements = (
  rc: Entitlements,
  server: ServerEntitlement[],
): Entitlements => {
  const sources = new Set(rc.sources);
  let unlimited = rc.unlimitedSwipes;
  let boost = rc.dailyBoost;
  let superLikes = rc.superLikes;
  let expiresAt = rc.expiresAt ?? null;

  server.forEach((item) => {
    if (item.product_id) {
      sources.add(item.product_id);
      sources.add(`${item.product_id}:${item.source}`);
    }
    if (isServerEntitlementActive(item)) {
      if (item.product_id === "unlimited") {
        unlimited = true;
      }
      if (item.product_id === "boost") {
        boost = true;
      }
      if (item.product_id === "super_likes") {
        superLikes = Math.max(superLikes, 1);
      }
      if (!expiresAt || item.period_end > expiresAt) {
        expiresAt = item.period_end;
      }
    }
  });

  return {
    unlimitedSwipes: unlimited,
    dailyBoost: boost,
    superLikes,
    expiresAt,
    sources: Array.from(sources),
  };
};

type RefreshContext = {
  trigger?: string;
};

export type EntitlementRefreshContext = RefreshContext;

export const useEntitlements = () => {
  const session = useSessionStore((state) => state.session);
  const [consumedSuperLikes, setConsumedSuperLikes] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);

  const revenuecatQuery = useQuery({
    queryKey: ["entitlements", "revenuecat", session?.user.id],
    enabled: Boolean(session?.user.id),
    staleTime: 60_000,
    queryFn: async () => {
      const Purchases = getPurchasesApi();
      if (!Purchases) {
        return defaultEntitlements;
      }
      const info = await Purchases.getCustomerInfo();
      return mapRevenueCat(info);
    },
  });

  const serverQuery = useQuery({
    queryKey: ["entitlements", "server", session?.user.id],
    enabled: Boolean(session?.user.id),
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("get_user_entitlements", {
        uid: session!.user.id,
      });
      if (error) throw error;
      return (data ?? []) as ServerEntitlement[];
    },
  });

  const merged = useMemo(() => {
    if (!session?.user.id) return defaultEntitlements;
    return mergeEntitlements(
      revenuecatQuery.data ?? defaultEntitlements,
      serverQuery.data ?? [],
    );
  }, [revenuecatQuery.data, serverQuery.data, session?.user.id]);

  useEffect(() => {
    setConsumedSuperLikes(0);
  }, [merged.superLikes, session?.user.id]);

  const effective = useMemo(
    () => ({
      ...merged,
      superLikes: Math.max(0, merged.superLikes - consumedSuperLikes),
    }),
    [merged, consumedSuperLikes],
  );

  const isLoading = revenuecatQuery.isLoading || serverQuery.isLoading;
  const error =
    (revenuecatQuery.error as Error | undefined)?.message ??
    (serverQuery.error as Error | undefined)?.message ??
    null;

  const refreshEntitlements = useCallback(
    async (context?: RefreshContext) => {
      if (!session?.user.id) {
        return defaultEntitlements;
      }

      const [rcResult, serverResult] = await Promise.all([
        revenuecatQuery.refetch({ throwOnError: true }),
        serverQuery.refetch({ throwOnError: true }),
      ]);

      const mergedResult = mergeEntitlements(
        rcResult.data ?? defaultEntitlements,
        serverResult.data ?? [],
      );

      const rcProducts = new Set<string>();
      (rcResult.data?.sources ?? [])
        .filter((source) => source.includes(":revenuecat"))
        .forEach((source) => {
          const [product] = source.split(":");
          if (product) {
            rcProducts.add(product);
          }
        });

      const webProducts = new Set<string>();
      (serverResult.data ?? []).forEach((item) => {
        if (item.product_id) {
          webProducts.add(item.product_id);
        }
      });

      trackTelemetry({
        name: "entitlements.synced",
        properties: {
          source: "rc",
          productCount: rcProducts.size,
          trigger: context?.trigger ?? "unknown",
        },
      });

      trackTelemetry({
        name: "entitlements.synced",
        properties: {
          source: "web",
          productCount: webProducts.size,
          trigger: context?.trigger ?? "unknown",
        },
      });

      return mergedResult;
    },
    [revenuecatQuery, serverQuery, session?.user.id],
  );

  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      const Purchases = getPurchasesApi();
      if (Purchases) {
        await Purchases.restorePurchases();
        await refreshEntitlements({ trigger: "restore" });
      } else {
        console.warn("RevenueCat not available; cannot restore purchases.");
      }
    } finally {
      setIsRestoring(false);
    }
  }, [refreshEntitlements]);

  const hasSuperLikeAvailable = effective.superLikes > 0;

  const consumeSuperLike = useCallback(() => {
    setConsumedSuperLikes((prev) => (merged.superLikes > prev ? prev + 1 : prev));
  }, [merged.superLikes]);

  const hasEntitlement = useCallback(
    (productId: string) => {
      if (productId === "unlimited") return effective.unlimitedSwipes;
      if (productId === "boost") return effective.dailyBoost;
      if (productId === "super_likes") return effective.superLikes > 0;
      return effective.sources.includes(productId);
    },
    [effective],
  );

  const isSubscribed = effective.unlimitedSwipes || effective.sources.length > 0;

  return {
    entitlements: effective,
    isLoading,
    error,
    hasSuperLikeAvailable,
    consumeSuperLike,
    refreshEntitlements,
    restorePurchases,
    hasEntitlement,
    isRestoring,
    isSubscribed,
  } as const;
};
