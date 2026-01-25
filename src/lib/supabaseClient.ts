import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SECURE_KEY = "sb.session";

const expoConfig = Constants.expoConfig?.extra ?? {};

const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);

const supabaseUrl =
  expoConfig.supabaseUrl ??
  expoConfig.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  expoConfig.supabaseAnonKey ??
  expoConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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

class AsyncStorageAdapter {
  async getItem(key: string) {
    return AsyncStorage.getItem(key);
  }

  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  }
}

class HybridWebStorageAdapter {
  private memory = new Map<string, string>();

  private shouldPersist(key: string) {
    return key.includes("code-verifier") || key === SECURE_KEY || key.endsWith("auth-token");
  }

  private getLocalStorage() {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  async getItem(key: string) {
    if (this.shouldPersist(key)) {
      try {
        return this.getLocalStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return this.memory.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    if (this.shouldPersist(key)) {
      try {
        this.getLocalStorage()?.setItem(key, value);
      } catch {
        // ignore storage errors
      }
      return;
    }
    this.memory.set(key, value);
  }

  async removeItem(key: string) {
    if (this.shouldPersist(key)) {
      try {
        this.getLocalStorage()?.removeItem(key);
      } catch {
        // ignore storage errors
      }
      return;
    }
    this.memory.delete(key);
  }
}

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!cachedClient) {
    const persistSession = !isTestEnv;
    const storage =
      Platform.OS === "web" ? new HybridWebStorageAdapter() : persistSession ? new SecureStoreAdapter() : undefined;
    cachedClient = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
      auth: {
        persistSession,
        storage,
        storageKey: isTestEnv ? undefined : SECURE_KEY,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === "web"
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

export const getSupabaseConfig = () => ({
  supabaseUrl,
  supabaseAnonKey
});

export const getFreshAccessToken = async (): Promise<string | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  const token = data?.session?.access_token ?? null;
  if (token) {
    return token;
  }
  if (error) {
    // Ignore and attempt refresh.
  }
  const refreshed = await supabase.auth.refreshSession();
  return refreshed.data.session?.access_token ?? null;
};

/**
 * Ensures we have a valid Supabase session.
 * Returns { session, error } where session can be null if the user is not authenticated.
 */
export const ensureFreshSession = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (data.session) {
    return { session: data.session, error: null };
  }
  if (error) {
    // Ignore and attempt refresh.
  }
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.data.session) {
    return { session: refreshed.data.session, error: null };
  }
  return { session: null, error: refreshed.error ?? error ?? null };
};
