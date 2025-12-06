import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export const getSupabaseAdminClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  let url = process.env.SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // In test runs allow fallback dummy values to avoid blowing up unit tests
  if ((!url || !serviceRoleKey) && process.env.NODE_ENV === "test") {
    url = process.env.SUPABASE_TEST_URL ?? "https://example.supabase.co";
    serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? "service_role_key";
  }

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
};
