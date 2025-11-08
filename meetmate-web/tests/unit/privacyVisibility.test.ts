import { describe, expect, it } from "vitest";
import { canAccessOriginal } from "@/lib/privacyVisibility";

describe("canAccessOriginal", () => {
  it("allows owner regardless of mode", () => {
    expect(
      canAccessOriginal({
        mode: "whitelist",
        isOwner: true,
        hasMatch: false,
        hasWhitelist: false
      })
    ).toBe(true);
  });

  it("requires match for match_only", () => {
    expect(
      canAccessOriginal({
        mode: "match_only",
        isOwner: false,
        hasMatch: false,
        hasWhitelist: false
      })
    ).toBe(false);

    expect(
      canAccessOriginal({
        mode: "match_only",
        isOwner: false,
        hasMatch: true,
        hasWhitelist: false
      })
    ).toBe(true);
  });

  it("requires whitelist for whitelist mode", () => {
    expect(
      canAccessOriginal({
        mode: "whitelist",
        isOwner: false,
        hasMatch: true,
        hasWhitelist: false
      })
    ).toBe(false);

    expect(
      canAccessOriginal({
        mode: "whitelist",
        isOwner: false,
        hasMatch: false,
        hasWhitelist: true
      })
    ).toBe(true);
  });
});
