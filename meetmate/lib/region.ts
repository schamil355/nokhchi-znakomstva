import * as Localization from "expo-localization";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "./supabase";
import { useSessionStore } from "../store/sessionStore";

export type SupportedCountry = "RU" | "FR" | "DE" | "AT" | "BE" | "NO" | "XX";

type RegionDetectionSource = "profile" | "edge" | "device";

type RegionDetectionResult = {
  country: SupportedCountry;
  source: RegionDetectionSource;
};

type RegionConfigRow = {
  country_code: string;
  paywall_mode: "iap" | "none";
  notes: string | null;
};

const NORMALIZE_MAP: Record<string, SupportedCountry> = {
  RU: "RU",
  FR: "FR",
  DE: "DE",
  AT: "AT",
  BE: "BE",
  NO: "NO",
};

const normalizeCountry = (value?: string | null): SupportedCountry => {
  if (!value) return "XX";
  const code = value.trim().slice(0, 2).toUpperCase();
  return NORMALIZE_MAP[code] ?? "XX";
};

export const resolveRegionConfig = (
  country: SupportedCountry,
  rows: RegionConfigRow[],
) => {
  const exact = rows.find((row) => normalizeCountry(row.country_code) === country);
  if (exact) {
    return {
      paywallMode: exact.paywall_mode,
      notes: exact.notes ?? null,
      country,
    };
  }
  const fallback = rows.find((row) => normalizeCountry(row.country_code) === "XX");
  if (fallback) {
    return {
      paywallMode: fallback.paywall_mode,
      notes: fallback.notes ?? null,
      country,
    };
  }
  return {
    paywallMode: "iap",
    notes: null,
    country,
  };
};

const fetchProfileCountry = async (userId: string): Promise<string | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("country")
    .eq("id", userId)
    .maybeSingle<{ country: string | null }>();
  if (error) {
    console.warn("Failed to fetch profile country", error);
    return null;
  }
  return data?.country ?? null;
};

const fetchEdgeCountry = async (): Promise<string | null> => {
  try {
    const response = await fetch("/geo", { method: "GET" });
    if (!response.ok) {
      console.warn("geo function returned non-200", response.status);
      return null;
    }
    const payload = (await response.json()) as { countryCode?: string | null };
    return payload.countryCode ?? null;
  } catch (error) {
    console.warn("Failed to call geo function", error);
    return null;
  }
};

export const detectRegion = async (): Promise<RegionDetectionResult> => {
  const session = useSessionStore.getState().session;
  const userId = session?.user.id ?? null;

  if (userId) {
    const profileCountry = await fetchProfileCountry(userId);
    const normalized = normalizeCountry(profileCountry);
    if (normalized !== "XX") {
      return { country: normalized, source: "profile" };
    }
  }

  const edgeCountry = await fetchEdgeCountry();
  const normalizedEdge = normalizeCountry(edgeCountry);
  if (normalizedEdge !== "XX") {
    return { country: normalizedEdge, source: "edge" };
  }

  const deviceRegion = normalizeCountry(
    Localization.region ?? Localization.isoCountryCodes?.[0],
  );
  return { country: deviceRegion, source: "device" };
};

export const getRegionConfig = async (
  country: SupportedCountry,
): Promise<{ country: SupportedCountry; paywallMode: "iap" | "none" }> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from<RegionConfigRow>("region_config")
    .select("country_code, paywall_mode")
    .eq("country_code", country)
    .maybeSingle();

  if (error) {
    console.warn("Failed to fetch region config", error);
    return { country, paywallMode: "iap" };
  }

  if (!data) {
    return { country, paywallMode: "iap" };
  }

  return {
    country: normalizeCountry(data.country_code),
    paywallMode: data.paywall_mode,
  };
};

export const useRegionOffering = () => {
  return useQuery({
    queryKey: ["region-offering"],
    queryFn: async () => {
      const detection = await detectRegion();
      const config = await getRegionConfig(detection.country);
      return {
        country: config.country,
        paywallMode: config.paywallMode,
        source: detection.source,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};
