import Constants from "expo-constants";
import { Platform } from "react-native";
import { getFreshAccessToken, getSupabaseClient } from "../lib/supabaseClient";

const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as any)?.apiUrl ??
  null;
const API_BASE = rawApiBase ? String(rawApiBase).replace(/\/$/, "") : null;

const rawVapidKey =
  process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_KEY ??
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_WEB_PUSH_VAPID_KEY ??
  "";

const SERVICE_WORKER_READY_TIMEOUT_MS = 8000;

const isSupportedEnvironment = () => {
  if (Platform.OS !== "web") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  if (!API_BASE || !rawVapidKey) return false;
  return true;
};

const waitForServiceWorkerReady = async (): Promise<ServiceWorkerRegistration> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error("SERVICE_WORKER_TIMEOUT")), SERVICE_WORKER_READY_TIMEOUT_MS);
  });
  try {
    return (await Promise.race([navigator.serviceWorker.ready, timeoutPromise])) as ServiceWorkerRegistration;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const getAccessToken = async () => {
  const token = await getFreshAccessToken();
  if (token) {
    return token;
  }
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

const apiFetch = async (path: string, body?: Record<string, any>) => {
  if (!API_BASE) {
    throw new Error("API_BASE_MISSING");
  }
  const token = await getAccessToken();
  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json().catch(() => ({}));
};

export const getWebPushStatus = async () => {
  if (!isSupportedEnvironment()) {
    return { supported: false, subscribed: false };
  }
  try {
    const registration = await waitForServiceWorkerReady();
    const subscription = await registration.pushManager.getSubscription();
    return { supported: true, subscribed: Boolean(subscription) };
  } catch (error) {
    console.warn("[WebPush] service worker not ready", error);
    return { supported: true, subscribed: false };
  }
};

export const subscribeWebPush = async () => {
  if (!isSupportedEnvironment()) {
    throw new Error("WEB_PUSH_UNSUPPORTED");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { status: permission } as const;
  }

  const registration = await waitForServiceWorkerReady();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(rawVapidKey)
  });

  await apiFetch("/v1/web-push/subscribe", {
    subscription,
    userAgent: navigator.userAgent
  });

  return { status: permission, subscription } as const;
};

export const unsubscribeWebPush = async () => {
  if (!isSupportedEnvironment()) {
    return { status: "unsupported" } as const;
  }
  const registration = await waitForServiceWorkerReady();
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await apiFetch("/v1/web-push/unsubscribe", {
      endpoint: subscription.endpoint
    });
    await subscription.unsubscribe();
  }
  return { status: "unsubscribed" } as const;
};

export const sendWebPushTest = async () => {
  if (!isSupportedEnvironment()) {
    throw new Error("WEB_PUSH_UNSUPPORTED");
  }
  await waitForServiceWorkerReady();
  await apiFetch("/v1/web-push/test", {
    title: "Test notification",
    body: "Your PWA can receive web push."
  });
};
