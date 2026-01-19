import Constants from "expo-constants";
import { getFreshAccessToken } from "../lib/supabaseClient";

const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  null;
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, "") : null;

const ensureApiBase = () => {
  if (!API_BASE) {
    throw new Error("API base URL missing. Please set EXPO_PUBLIC_API_URL.");
  }
  return API_BASE;
};

const getAccessToken = async () => {
  const token = await getFreshAccessToken();
  if (!token) {
    throw new Error("Not authenticated.");
  }
  return token;
};

export const deleteAccount = async (opts: { dryRun?: boolean } = {}) => {
  const params = opts.dryRun ? "?dryRun=true" : "";
  const token = await getAccessToken();
  const response = await fetch(`${ensureApiBase()}/v1/account${params}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    let message = "Failed to delete account.";
    try {
      const payload = await response.json();
      message = payload.error ?? payload.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.json();
};
