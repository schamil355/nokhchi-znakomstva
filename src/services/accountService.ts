import { getFreshAccessToken } from "../lib/supabaseClient";
import { getApiBase } from "../lib/apiBase";

const ensureApiBase = () => {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("API base URL missing. Please set EXPO_PUBLIC_API_URL.");
  }
  return apiBase;
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

export const registerEmailAccount = async (email: string, password: string) => {
  const response = await fetch(`${ensureApiBase()}/v1/account/register/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    let message = "Failed to register account.";
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
