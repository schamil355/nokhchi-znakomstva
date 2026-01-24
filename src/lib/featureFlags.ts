import { useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabaseClient } from "./supabaseClient";

export type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  rollout_pct: number;
  platform: "all" | "mobile" | "web" | string;
  updated_at?: string;
};

const FLAG_CACHE_TTL_MS = 60_000;
const DEVICE_ID_KEY = "feature_flags:device_id";
const OVERRIDE_PREFIX = "feature_flags:override:";

const flagCache = new Map<string, { value: boolean; fetchedAt: number }>();
const inflight = new Map<string, Promise<boolean>>();

const getPlatformKey = () => (Platform.OS === "web" ? "web" : "mobile");

const hashToBucket = (value: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
};

const generateDeviceId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const getOrCreateDeviceId = async (): Promise<string | null> => {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) {
      return existing;
    }
    const next = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch (error) {
    console.warn("[featureFlags] failed to access device id", error);
    return null;
  }
};

const resolveIdentity = async () => {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (userId) {
      return userId;
    }
  } catch (error) {
    // Ignore auth lookup errors and fall back to device id.
  }
  return getOrCreateDeviceId();
};

const evaluateFlag = async (flag: FeatureFlagRow, platform: "web" | "mobile") => {
  if (!flag.enabled) {
    return false;
  }
  if (flag.platform !== "all" && flag.platform !== platform) {
    return false;
  }
  const rollout = Number.isFinite(flag.rollout_pct) ? flag.rollout_pct : 0;
  if (rollout >= 100) {
    return true;
  }
  if (rollout <= 0) {
    return false;
  }
  const identity = await resolveIdentity();
  if (!identity) {
    return false;
  }
  const bucket = hashToBucket(`${flag.key}:${identity}`);
  return bucket < rollout;
};

const getCacheKey = (key: string, platform: string) => `${key}:${platform}`;

const normalizeOverride = (value: string | null) => {
  if (!value) return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === "1" || lowered === "true" || lowered === "on") return true;
  if (lowered === "0" || lowered === "false" || lowered === "off") return false;
  if (lowered === "clear") return null;
  return null;
};

const readOverride = async (key: string): Promise<boolean | null> => {
  if (Platform.OS !== "web") {
    return null;
  }
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const paramValue = params.get(`ff_${key}`);
    const normalized = normalizeOverride(paramValue);
    if (paramValue !== null) {
      if (normalized === null && paramValue?.trim().toLowerCase() === "clear") {
        await AsyncStorage.removeItem(`${OVERRIDE_PREFIX}${key}`);
        return null;
      }
      if (normalized !== null) {
        await AsyncStorage.setItem(`${OVERRIDE_PREFIX}${key}`, normalized ? "true" : "false");
        return normalized;
      }
    }
  }
  try {
    const stored = await AsyncStorage.getItem(`${OVERRIDE_PREFIX}${key}`);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return null;
  } catch (error) {
    console.warn("[featureFlags] override read failed", error);
    return null;
  }
};

export type FeatureFlagOptions = {
  platform?: "web" | "mobile";
  defaultValue?: boolean;
  forceRefresh?: boolean;
};

export const getFeatureFlag = async (key: string, options: FeatureFlagOptions = {}): Promise<boolean> => {
  const platform = options.platform ?? getPlatformKey();
  const cacheKey = getCacheKey(key, platform);
  const cached = flagCache.get(cacheKey);
  if (!options.forceRefresh && cached && Date.now() - cached.fetchedAt < FLAG_CACHE_TTL_MS) {
    return cached.value;
  }
  const existing = inflight.get(cacheKey);
  if (existing) {
    return existing;
  }
  const fetchPromise = (async () => {
    try {
      const override = await readOverride(key);
      if (override !== null) {
        flagCache.set(cacheKey, { value: override, fetchedAt: Date.now() });
        return override;
      }
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, enabled, rollout_pct, platform, updated_at")
        .eq("key", key)
        .maybeSingle();

      if (error) {
        console.warn("[featureFlags] fetch failed", error);
        const fallback = options.defaultValue ?? false;
        flagCache.set(cacheKey, { value: fallback, fetchedAt: Date.now() });
        return fallback;
      }

      if (!data) {
        const fallback = options.defaultValue ?? false;
        flagCache.set(cacheKey, { value: fallback, fetchedAt: Date.now() });
        return fallback;
      }

      const enabled = await evaluateFlag(data as FeatureFlagRow, platform);
      flagCache.set(cacheKey, { value: enabled, fetchedAt: Date.now() });
      return enabled;
    } catch (error) {
      console.warn("[featureFlags] fetch error", error);
      const fallback = options.defaultValue ?? false;
      flagCache.set(cacheKey, { value: fallback, fetchedAt: Date.now() });
      return fallback;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, fetchPromise);
  return fetchPromise;
};

export const getCachedFeatureFlag = (key: string, platform: "web" | "mobile" = getPlatformKey()) => {
  const cached = flagCache.get(getCacheKey(key, platform));
  return cached?.value ?? null;
};

export type UseFeatureFlagOptions = FeatureFlagOptions & {
  refreshIntervalMs?: number;
};

export const useFeatureFlag = (key: string, options: UseFeatureFlagOptions = {}) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const cached = getCachedFeatureFlag(key, options.platform ?? getPlatformKey());
    if (cached === null || cached === undefined) {
      return options.defaultValue ?? false;
    }
    return cached;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getCachedFeatureFlag(key, options.platform ?? getPlatformKey());
    return cached === null || cached === undefined;
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const value = await getFeatureFlag(key, options);
      if (!active) return;
      setEnabled(value);
      setLoading(false);
    };
    load();
    const intervalMs = options.refreshIntervalMs;
    if (intervalMs && intervalMs > 0) {
      const intervalId = setInterval(load, intervalMs);
      return () => {
        active = false;
        clearInterval(intervalId);
      };
    }
    return () => {
      active = false;
    };
  }, [key, options.defaultValue, options.forceRefresh, options.platform, options.refreshIntervalMs]);

  return { enabled, loading };
};
