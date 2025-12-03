import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const SECURE_KEY = "sb.session";

const expoConfig = Constants.expoConfig?.extra ?? {};

const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);

const supabaseUrl = expoConfig.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = expoConfig.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Allow enough time for slower uploads (e.g., photos).
const REQUEST_TIMEOUT_MS = 300_000;

const timeoutFetch: typeof fetch = (resource, options = {}) => {
  const controller = new AbortController();
  const userSignal = (options as any).signal as AbortSignal | undefined;

  if (userSignal?.aborted) {
    controller.abort();
  } else if (userSignal) {
    userSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return fetch(resource as any, { ...(options as any), signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

class SecureStoreAdapter {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  }

  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  }

  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  }
}

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
      auth: {
        persistSession: !isTestEnv,
        storage: isTestEnv ? undefined : new SecureStoreAdapter(),
        storageKey: isTestEnv ? undefined : SECURE_KEY,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          "X-Client-Info": "tschetschenische-dating-app"
        },
        fetch: timeoutFetch
      }
    });
  }
  return cachedClient;
};

/**
 * Ensures we have a valid Supabase session.
 * Returns { session, error } where session can be null if the user is not authenticated.
 */
export const ensureFreshSession = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { session: null, error };
  }
  return { session: data.session, error: null };
};
