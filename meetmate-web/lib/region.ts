"use server";

import "server-only";

export type PaywallMode = "iap" | "none";

const REGION_RULES: Record<string, { paywallMode: PaywallMode; notes?: string | null }> = {
  RU: { paywallMode: "none", notes: "Paywall disabled due to regional policy" }
};

export const getRegionConfig = async (countryCode: string): Promise<{ paywallMode: PaywallMode; notes: string | null }> => {
  const normalized = countryCode?.toUpperCase() ?? "XX";
  const rule = REGION_RULES[normalized];
  if (rule) {
    return {
      paywallMode: rule.paywallMode,
      notes: rule.notes ?? null
    };
  }
  return {
    paywallMode: "iap",
    notes: null
  };
};
