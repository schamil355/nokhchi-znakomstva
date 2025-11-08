// meetmate-web/lib/env.ts
type GlobalWithEnv = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

const globalEnv = globalThis as GlobalWithEnv;

const readEnv = (key: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string => {
  return (
    globalEnv.process?.env?.[key] ??
    (globalEnv[key] as string | undefined) ??
    ""
  );
};

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;

export const SUPABASE_ENABLED =
  !!env.NEXT_PUBLIC_SUPABASE_URL && !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
