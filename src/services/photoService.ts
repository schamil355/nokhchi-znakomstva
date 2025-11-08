import Constants from "expo-constants";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";

const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:3000";
const API_BASE = rawApiBase.replace(/\/$/, "");
const DEFAULT_SIGNED_TTL_MS = 120_000;

const ensureApiBase = () => API_BASE;

const getAccessToken = () => {
  const token = useAuthStore.getState().session?.access_token;
  if (!token) {
    throw new Error("Nicht eingeloggt.");
  }
  return token;
};

const jsonRequest = async <T>(path: string, body: Record<string, unknown>, method: "POST" | "DELETE" | "PATCH" = "POST") => {
  const response = await fetch(`${ensureApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json"
    },
    body: method === "DELETE" ? JSON.stringify(body) : JSON.stringify(body)
  });

  if (!response.ok) {
    let message = "API-Fehler";
    try {
      const payload = await response.json();
      message = payload.error ?? payload.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
};

export type VisibilityMode = "public" | "match_only" | "whitelist" | "blurred_until_match";

export const uploadOriginalAsync = async (fileUri: string, userId: string): Promise<string> => {
  const supabase = getSupabaseClient();
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error("Datei konnte nicht geladen werden.");
  }
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] ?? "jpg";
  const safeExtension = extension === "jpeg" ? "jpg" : extension;
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;

  const { error } = await supabase.storage.from("photos_private").upload(fileName, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true
  });
  if (error) {
    throw new Error(error.message ?? "Upload fehlgeschlagen.");
  }

  return fileName;
};

export const registerPhoto = (storagePath: string, visibility_mode: VisibilityMode) =>
  jsonRequest<{ photoId: number }>("/v1/photos/register", { storagePath, visibility_mode });

export type SignedPhotoResponse = { url: string; modeReturned: "original" | "blur"; ttl?: number };

export const getSignedPhotoUrl = (photoId: number, variant?: "original" | "blur") =>
  jsonRequest<SignedPhotoResponse>("/v1/photos/view", {
    photoId,
    variant
  });

export const updatePrivacySettings = (payload: { is_incognito?: boolean; show_distance?: boolean; show_last_seen?: boolean }) =>
  jsonRequest<{ ok: boolean }>("/v1/settings/privacy", payload);

export const changeVisibility = (photoId: number, visibility_mode: VisibilityMode) =>
  jsonRequest<{ ok: boolean }>("/v1/photos/visibility", { photoId, visibility_mode });

export const deletePhoto = (photoId: number) =>
  fetch(`${ensureApiBase()}/v1/photos/${photoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json"
    }
  }).then(async (res) => {
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error ?? payload.message ?? "Löschen fehlgeschlagen");
    }
    return res.json();
  });

export const revokePermission = (photoId: number, viewerId: string) =>
  fetch(`${ensureApiBase()}/v1/photos/permissions`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ photoId, viewerId })
  }).then(async (res) => {
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error ?? payload.message ?? "Freigabe konnte nicht widerrufen werden.");
    }
    return res.json();
  });

export const revokeAllPermissions = (photoId: number) =>
  fetch(`${ensureApiBase()}/v1/photos/permissions/all`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ photoId })
  }).then(async (res) => {
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error ?? payload.message ?? "Freigaben konnten nicht gelöscht werden.");
    }
    return res.json();
  });

export const revokeAll = revokeAllPermissions;
