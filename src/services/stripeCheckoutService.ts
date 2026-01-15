import Constants from "expo-constants";
import { useAuthStore } from "../state/authStore";

const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  null;
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, "") : null;

const ensureApiBase = () => {
  if (!API_BASE) {
    throw Object.assign(new Error("API base URL missing. Please set EXPO_PUBLIC_API_URL."), {
      code: "API_BASE_MISSING",
    });
  }
  return API_BASE;
};

const withCode = (code: string, message?: string) =>
  Object.assign(new Error(message ?? code), { code });

const extractErrorMessage = (payload: any, fallback: string) => {
  if (!payload) {
    return fallback;
  }
  const rawMessage = payload.message ?? payload.error ?? fallback;
  if (Array.isArray(rawMessage)) {
    return rawMessage.filter(Boolean).join(", ") || fallback;
  }
  if (typeof rawMessage === "string" && rawMessage.trim().length > 0) {
    return rawMessage;
  }
  return fallback;
};

const getAccessToken = () => {
  const token = useAuthStore.getState().session?.access_token;
  if (!token) {
    throw withCode("AUTH_REQUIRED", "Not authenticated.");
  }
  return token;
};

export type StripePlanId = "monthly" | "yearly";
export type StripeCurrency = "EUR" | "NOK";

export const fetchStripePlanAvailability = async (
  currency: StripeCurrency
): Promise<{ currency: StripeCurrency; plans: StripePlanId[] }> => {
  const response = await fetch(
    `${ensureApiBase()}/v1/payments/stripe/plans?currency=${encodeURIComponent(currency)}`
  );

  if (!response.ok) {
    let message = "Failed to load plans.";
    try {
      const payload = await response.json();
      message = extractErrorMessage(payload, message);
    } catch {
      // ignore parse errors
    }
    throw withCode("PLANS_FAILED", message);
  }

  return (await response.json()) as { currency: StripeCurrency; plans: StripePlanId[] };
};

export const createStripeCheckoutSession = async (params: {
  planId: StripePlanId;
  currency: StripeCurrency;
}): Promise<{ url: string }> => {
  const response = await fetch(`${ensureApiBase()}/v1/payments/stripe/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let message = "Checkout failed.";
    try {
      const payload = await response.json();
      message = extractErrorMessage(payload, message);
    } catch {
      // ignore parse errors
    }
    throw withCode("CHECKOUT_FAILED", message);
  }

  return (await response.json()) as { url: string };
};
