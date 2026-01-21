import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as FileSystemType from "expo-file-system";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { getSupabaseClient, getFreshAccessToken } from "../lib/supabaseClient";
import { getCurrentLocale } from "../localization/LocalizationProvider";
import { PROFILE_BUCKET } from "../lib/storage";
import type * as ImageManipulatorType from "expo-image-manipulator";

const FileSystem =
  Platform.OS === "web"
    ? null
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Native-only module on web.
    : (require("expo-file-system") as typeof FileSystemType);
const ImageManipulator =
  Platform.OS === "web"
    ? null
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Native-only module on web.
    : (require("expo-image-manipulator") as typeof ImageManipulatorType);

const rawApiBase =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  null;
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

const withCode = (code: string, message?: string) => Object.assign(new Error(message ?? code), { code });

const ensureApiBase = () => {
  if (!API_BASE) {
    throw new Error(t("apiBaseMissing"));
  }
  return API_BASE;
};

const getAccessToken = async () => {
  const token = await getFreshAccessToken();
  if (!token) {
    throw withCode("AUTH_REQUIRED", t("notLoggedIn"));
  }
  return token;
};

const jsonRequest = async <T>(
  path: string,
  body: Record<string, unknown>,
  method: "POST" | "DELETE" | "PATCH" = "POST"
) => {
  const token = await getAccessToken();
  const response = await fetch(`${ensureApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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
  if (!FileSystem || !ImageManipulator) {
    throw new Error(t("uploadFailed"));
  }
  // Stelle sicher, dass eine Session/Tokens vorhanden sind, sonst schlägt Storage mit 401 fehl.
  const ensureToken = async (): Promise<string> => {
    const { data, error } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      return token;
    }
    if (error) {
      // Ignorieren und versuchen zu refreshen.
    }
    const refreshed = await supabase.auth.refreshSession();
    const refreshedToken = refreshed.data.session?.access_token;
    if (refreshedToken) {
      return refreshedToken;
    }
    throw new Error(t("uploadFailed"));
  };
  const accessToken = await ensureToken();
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
    upsert: true,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
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

export const updatePrivacySettings = (payload: {
  is_incognito?: boolean;
  show_distance?: boolean;
  show_last_seen?: boolean;
  hide_nearby?: boolean;
  hide_nearby_radius?: number;
  latitude?: number;
  longitude?: number;
}) =>
  jsonRequest<{ ok: boolean }>("/v1/settings/privacy", payload);

export const changeVisibility = (photoId: number, visibility_mode: VisibilityMode) =>
  jsonRequest<{ ok: boolean }>("/v1/photos/visibility", { photoId, visibility_mode });

export const deletePhoto = async (photoId: number) => {
  const token = await getAccessToken();
  const res = await fetch(`${ensureApiBase()}/v1/photos/${photoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (res.status === 404) {
    return {};
  }
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? payload.message ?? t("deleteFailed"));
  }
  return res.json();
};

export const revokePermission = async (photoId: number, viewerId: string) => {
  const token = await getAccessToken();
  const res = await fetch(`${ensureApiBase()}/v1/photos/permissions`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ photoId, viewerId })
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? payload.message ?? t("revokeFailed"));
  }
  return res.json();
};

export const revokeAllPermissions = async (photoId: number) => {
  const token = await getAccessToken();
  const res = await fetch(`${ensureApiBase()}/v1/photos/permissions/all`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ photoId })
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? payload.message ?? t("revokeAllFailed"));
  }
  return res.json();
};

export const revokeAll = revokeAllPermissions;
