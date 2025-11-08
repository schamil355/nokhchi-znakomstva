import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const SECURE_KEY = "sb.session";

const expoConfig = Constants.expoConfig?.extra ?? {};

const supabaseUrl =
  expoConfig.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  expoConfig.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

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
        persistSession: true,
        storage: new SecureStoreAdapter(),
        storageKey: SECURE_KEY,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          "X-Client-Info": "tschetschenische-dating-app"
        }
      }
    });
  }
  return cachedClient;
};
