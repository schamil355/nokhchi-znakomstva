import { Platform } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

const assertApiBase = () => {
  if (!API_BASE) {
    throw new Error("API_BASE_URL_NOT_CONFIGURED");
  }
};

const jsonHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

type FetchOptions = Omit<RequestInit, "headers"> & { headers?: Record<string, string> };

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let message = "VERIFICATION_REQUEST_FAILED";
    try {
      const payload = await response.json();
      message = payload?.message ?? payload?.error ?? message;
    } catch (error) {
      // ignore JSON parse errors for non-json responses
    }
    throw new Error(message);
  }
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
};

const request = async <T>(
  path: string,
  token: string,
  options: FetchOptions,
): Promise<T> => {
  assertApiBase();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  return handleResponse<T>(response);
};

export type StartVerificationResponse = {
  sessionId: string;
  steps: string[];
  expiresAt?: string;
};

export const startVerification = async (
  token: string,
): Promise<StartVerificationResponse> =>
  request<StartVerificationResponse>("/v1/verification/start", token, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({}),
  });

export type UploadSelfieResponse = {
  ok: boolean;
  similarity: number;
  next: string;
};

const guessMimeType = (uri: string): string => {
  if (uri.endsWith(".png")) return "image/png";
  if (uri.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
};

export const uploadSelfie = async (
  token: string,
  params: { sessionId: string; captureFlag: boolean; uri: string },
): Promise<UploadSelfieResponse> => {
  assertApiBase();
  const { uri } = params;
  const formData = new FormData();
  formData.append("sessionId", params.sessionId);
  formData.append("captureFlag", String(params.captureFlag));

  const fileName = `selfie-${Date.now()}.jpg`;
  if (Platform.OS === "ios") {
    formData.append("selfie", {
      uri,
      name: fileName,
      type: guessMimeType(uri),
    } as any);
  } else {
    // Android requires file scheme
    const normalizedUri = uri.startsWith("file://") ? uri : `file://${uri}`;
    formData.append("selfie", {
      uri: normalizedUri,
      name: fileName,
      type: guessMimeType(uri),
    } as any);
  }

  const response = await fetch(`${API_BASE}/v1/verification/upload-selfie`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  return handleResponse<UploadSelfieResponse>(response);
};

export type SendOtpRequest = {
  sessionId: string;
  channel?: "email" | "sms";
};

export type SendOtpResponse = {
  channel?: "email" | "sms";
  expiresIn?: number;
};

export const sendOtp = (token: string, body: SendOtpRequest): Promise<SendOtpResponse> =>
  request<SendOtpResponse>("/v1/verification/send-otp", token, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

export const verifyOtp = (
  token: string,
  body: { sessionId: string; code: string },
): Promise<{ status: string }> =>
  request<{ status: string }>("/v1/verification/verify-otp", token, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });

export const fetchVerificationStatus = (token: string, sessionId: string) =>
  request<{
    sessionId: string;
    status: string;
    similarityScore?: number;
    livenessScore?: number;
    failureReason?: string;
    expiresAt?: string;
  }>(`/v1/verification/status?sessionId=${sessionId}`, token, {
    method: "GET",
  });
