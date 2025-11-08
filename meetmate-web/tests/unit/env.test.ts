import { describe, expect, it, vi } from "vitest";

const loadEnvModule = async (overrides: Record<string, string | undefined>) => {
  vi.resetModules();
  const originalEnv = { ...process.env };
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });

  const mod = await import("../../lib/env");
  process.env = originalEnv;
  return mod;
};

describe("env helper", () => {
  it("disables Supabase when keys are missing", async () => {
    const { SUPABASE_ENABLED } = await loadEnvModule({
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ""
    });
    expect(SUPABASE_ENABLED).toBe(false);
  });

  it("enables Supabase when both keys exist", async () => {
    const { SUPABASE_ENABLED, env } = await loadEnvModule({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
    });
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("anon-key");
    expect(SUPABASE_ENABLED).toBe(true);
  });
});
