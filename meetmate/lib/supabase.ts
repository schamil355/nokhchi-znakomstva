import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials are missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.",
  );
}

let singleton: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!singleton) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are not configured.");
    }

    singleton = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storage: {
          getItem: (key) => AsyncStorage.getItem(key),
          setItem: (key, value) => AsyncStorage.setItem(key, value),
          removeItem: (key) => AsyncStorage.removeItem(key),
        },
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "X-Client-Info": "meetmate",
        },
      },
    });
  }

  return singleton;
};

export const rpc = async <
  TResponse = unknown,
  TArgs extends Record<string, unknown> = Record<string, unknown>,
>(
  functionName: string,
  args?: TArgs,
): Promise<TResponse> => {
  const { data, error } = await getSupabase().rpc<TResponse>(functionName, args ?? {});
  if (error) {
    throw error;
  }
  return data;
};

export const fromSafe = <T = unknown>(table: string) => getSupabase().from<T>(table);

export const storageBucket = (bucket: string) => getSupabase().storage.from(bucket);
