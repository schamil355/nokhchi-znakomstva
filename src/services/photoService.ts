import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";
import { getCurrentLocale } from "../localization/LocalizationProvider";
import { PROFILE_BUCKET } from "../lib/storage";
import * as ImageManipulator from "expo-image-manipulator";

const rawApiBase = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? null;
const API_BASE = rawApiBase ? rawApiBase.replace(/\/$/, "") : null;

const serviceCopy: Record<string, Record<string, string>> = {
  en: {
    apiBaseMissing: "API base URL missing. Please set EXPO_PUBLIC_API_URL.",
    notLoggedIn: "Not signed in.",
    fileNotFound: "File could not be found.",
    uploadFailed: "Upload failed.",
    apiError: "API error",
    deleteFailed: "Delete failed",
    revokeFailed: "Could not revoke permission.",
    revokeAllFailed: "Could not revoke permissions."
  },
  de: {
    apiBaseMissing: "API-Basis-URL fehlt. Bitte EXPO_PUBLIC_API_URL setzen.",
    notLoggedIn: "Nicht eingeloggt.",
    fileNotFound: "Datei konnte nicht gefunden werden.",
    uploadFailed: "Upload fehlgeschlagen.",
    apiError: "API-Fehler",
    deleteFailed: "Löschen fehlgeschlagen",
    revokeFailed: "Freigabe konnte nicht widerrufen werden.",
    revokeAllFailed: "Freigaben konnten nicht gelöscht werden."
  },
  fr: {
    apiBaseMissing: "URL de base API manquante. Merci de définir EXPO_PUBLIC_API_URL.",
    notLoggedIn: "Non connecté.",
    fileNotFound: "Fichier introuvable.",
    uploadFailed: "Échec du téléchargement.",
    apiError: "Erreur API",
    deleteFailed: "Échec de la suppression",
    revokeFailed: "Impossible de révoquer l'autorisation.",
    revokeAllFailed: "Impossible de révoquer les autorisations."
  },
  ru: {
    apiBaseMissing: "Не задан базовый URL API. Укажите EXPO_PUBLIC_API_URL.",
    notLoggedIn: "Не выполнен вход.",
    fileNotFound: "Файл не найден.",
    uploadFailed: "Не удалось загрузить.",
    apiError: "Ошибка API",
    deleteFailed: "Не удалось удалить",
    revokeFailed: "Не удалось отозвать доступ.",
    revokeAllFailed: "Не удалось отозвать все доступы."
  }
} satisfies Record<SupportedLocale, Record<string, string>>;

const t = (key: keyof typeof serviceCopy.en) => {
  const locale = getCurrentLocale();
  return serviceCopy[locale]?.[key] ?? serviceCopy.en[key];
};

const ensureApiBase = () => {
  if (!API_BASE) {
    throw new Error(t("apiBaseMissing"));
  }
  return API_BASE;
};

const getAccessToken = () => {
  const token = useAuthStore.getState().session?.access_token;
  if (!token) {
    throw new Error(t("notLoggedIn"));
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
    let message = t("apiError");
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

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp"
};

const inferExtension = (uri: string) => {
  const match = /\.([a-zA-Z0-9]+)$/.exec(uri);
  return match ? match[1].toLowerCase() : "jpg";
};

export const uploadOriginalAsync = async (fileUri: string, userId: string): Promise<string> => {
  const supabase = getSupabaseClient();
  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error(t("fileNotFound"));
  }
  // Run a lightweight downscale to keep uploads fast on mobile networks.
  const manipResult = await ImageManipulator.manipulateAsync(
    fileUri,
    [{ resize: { width: 1280 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  const targetUri = manipResult.uri ?? fileUri;
  const extensionSource = inferExtension(targetUri);
  const safeExtension = extensionSource === "jpeg" ? "jpg" : extensionSource;
  const contentType = MIME_MAP[safeExtension] ?? "image/jpeg";
  const base64 = await FileSystem.readAsStringAsync(targetUri, { encoding: FileSystem.EncodingType.Base64 });
  const buffer = decodeBase64(base64);
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExtension}`;

  const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(fileName, buffer, {
    contentType,
    upsert: true
  });
  if (error) {
    throw new Error(error.message ?? t("uploadFailed"));
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
    if (res.status === 404) {
      return {};
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error ?? payload.message ?? t("deleteFailed"));
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
      throw new Error(payload.error ?? payload.message ?? t("revokeFailed"));
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
      throw new Error(payload.error ?? payload.message ?? t("revokeAllFailed"));
    }
    return res.json();
  });

export const revokeAll = revokeAllPermissions;
