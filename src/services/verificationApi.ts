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
    throw new Error("API base URL missing. Please set EXPO_PUBLIC_API_URL.");
  }
  return API_BASE;
};

const withCode = (code: string, message?: string) => Object.assign(new Error(message ?? code), { code });

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

export type VerificationSession = {
  sessionId: string;
  steps: string[];
  expiresAt?: string;
};

export const startVerificationSession = async (): Promise<VerificationSession> => {
  const response = await fetch(`${ensureApiBase()}/v1/verification/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
  });

  if (!response.ok) {
    let message = "Failed to start verification.";
    try {
      const payload = await response.json();
      message = extractErrorMessage(payload, message);
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await response.json()) as VerificationSession;
};

export const uploadVerificationSelfie = async (params: {
  sessionId: string;
  fileUri?: string;
  file?: Blob;
  mimeType?: string;
  captureFlag?: boolean;
}): Promise<{ ok: boolean; similarity: number; next: string }> => {
  const { sessionId, fileUri, file, mimeType = "image/jpeg", captureFlag = true } = params;
  const formData = new FormData();
  formData.append("sessionId", sessionId);
  formData.append("captureFlag", captureFlag ? "true" : "false");
  if (file) {
    if (typeof File !== "undefined" && file instanceof File) {
      formData.append("selfie", file);
    } else {
      formData.append("selfie", file, "selfie.jpg");
    }
  } else if (fileUri) {
    formData.append("selfie", {
      uri: fileUri,
      name: "selfie.jpg",
      type: mimeType,
    } as any);
  } else {
    throw new Error("Missing selfie file.");
  }

  const response = await fetch(`${ensureApiBase()}/v1/verification/upload-selfie`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = "Upload failed.";
    let payloadText = "";
    try {
      payloadText = await response.text();
      const payload = JSON.parse(payloadText);
      message = extractErrorMessage(payload, message);
    } catch {
      // ignore parse errors
    }
    // Log for debugging network errors
    console.log("[uploadVerificationSelfie] failed", response.status, payloadText || message);
    throw new Error(message);
  }

  return (await response.json()) as { ok: boolean; similarity: number; next: string };
};
