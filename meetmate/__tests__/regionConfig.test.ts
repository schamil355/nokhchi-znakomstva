jest.mock("react-native-url-polyfill/auto", () => ({}));

jest.mock("expo-localization", () => ({
  region: "de",
  isoCountryCodes: ["DE", "AT"],
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

let warnSpy: jest.SpyInstance | undefined;
let resolveRegionConfig: typeof import("../lib/region").resolveRegionConfig;

beforeAll(() => {
  warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  resolveRegionConfig = require("../lib/region")
    .resolveRegionConfig as typeof import("../lib/region").resolveRegionConfig;
});

afterAll(() => {
  warnSpy?.mockRestore();
});

describe("resolveRegionConfig", () => {
  it("returns country specific configuration when available", () => {
    const rows = [{ country_code: "ru", paywall_mode: "none", notes: "restricted" }];
    const result = resolveRegionConfig("RU", rows as any);
    expect(result).toEqual({
      paywallMode: "none",
      notes: "restricted",
      country: "RU",
    });
  });

  it("uses fallback configuration for unknown countries", () => {
    const rows = [{ country_code: "XX", paywall_mode: "iap", notes: "global" }];
    const result = resolveRegionConfig("FR", rows as any);
    expect(result).toEqual({
      paywallMode: "iap",
      notes: "global",
      country: "FR",
    });
  });

  it("falls back to default iap when nothing matches", () => {
    const result = resolveRegionConfig("FR", [] as any);
    expect(result).toEqual({
      paywallMode: "iap",
      notes: null,
      country: "FR",
    });
  });
});
