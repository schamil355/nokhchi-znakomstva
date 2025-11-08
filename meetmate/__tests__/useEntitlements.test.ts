jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {},
}));

jest.mock("../lib/telemetry", () => ({
  trackTelemetry: jest.fn(),
}));

jest.mock("../lib/supabase", () => ({
  getSupabase: () => ({
    rpc: async () => ({ data: [], error: null }),
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  defaultEntitlements,
  mapRevenueCat,
  mergeEntitlements,
} from "../features/paywall/hooks";

describe("mapRevenueCat", () => {
  it("returns defaults when no info", () => {
    expect(mapRevenueCat()).toEqual(defaultEntitlements);
  });

  it("maps active entitlements", () => {
    const customerInfo: any = {
      entitlements: {
        active: {
          unlimited_swipes: {
            identifier: "unlimited_swipes",
            productIdentifier: "prod_unlimited",
          },
          daily_boost: { identifier: "daily_boost", productIdentifier: "prod_boost" },
          super_likes: {
            identifier: "super_likes",
            metadata: { tokens: "3" },
            productIdentifier: "prod_super",
          },
        },
      },
    };
    const result = mapRevenueCat(customerInfo);
    expect(result.unlimitedSwipes).toBe(true);
    expect(result.dailyBoost).toBe(true);
    expect(result.superLikes).toBe(3);
    expect(result.expiresAt).toBeNull();
    expect(new Set(result.sources)).toEqual(
      new Set([
        "unlimited",
        "unlimited:revenuecat",
        "boost",
        "boost:revenuecat",
        "super_likes",
        "super_likes:revenuecat",
        "prod_unlimited",
        "prod_unlimited:revenuecat",
        "prod_boost",
        "prod_boost:revenuecat",
        "prod_super",
        "prod_super:revenuecat",
      ]),
    );
  });

  it("falls back to one super like when metadata missing", () => {
    const customerInfo: any = {
      entitlements: {
        active: {
          super_likes: { identifier: "super_likes" },
        },
      },
    };
    const result = mapRevenueCat(customerInfo);
    expect(result.superLikes).toBe(1);
    expect(result.sources).toEqual(["super_likes", "super_likes:revenuecat"]);
  });
});

describe("mergeEntitlements", () => {
  it("merges server entitlements", () => {
    const rc = mapRevenueCat();
    const merged = mergeEntitlements(rc, [
      {
        product_id: "unlimited",
        source: "web_psp",
        period_end: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ]);
    expect(merged.unlimitedSwipes).toBe(true);
    expect(merged.sources).toContain("unlimited");
    expect(merged.sources).toContain("unlimited:web_psp");
  });
});
