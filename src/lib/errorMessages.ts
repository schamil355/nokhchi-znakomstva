import * as Sentry from "@sentry/react-native";
import { getCurrentLocale, SupportedLocale, useLocalizedCopy } from "../localization/LocalizationProvider";

export type ErrorCopy = {
  title: string;
  unknown: string;
  network: string;
  authRequired: string;
  invalidEmail: string;
  invalidPassword: string;
  invalidCredentials: string;
  emailNotConfirmed: string;
  rateLimited: string;
  sessionExpired: string;
  notFound: string;
  permissionDenied: string;
  smsSendFailed: string;
  purchaseCancelled: string;
  purchaseNotAllowed: string;
  purchaseFailed: string;
  restoreFailed: string;
  uploadFailed: string;
};

export const errorTranslations: Record<SupportedLocale, ErrorCopy> = {
  en: {
    title: "Error",
    unknown: "Something went wrong. Please try again.",
    network: "Network unavailable. Please check your connection.",
    authRequired: "Please sign in again.",
    invalidEmail: "Please enter a valid email address.",
    invalidPassword: "Password is too weak. Please choose a stronger one.",
    invalidCredentials: "Email or password is incorrect.",
    emailNotConfirmed: "Please confirm your email before signing in.",
    rateLimited: "Too many attempts. Please wait a moment and try again.",
    sessionExpired: "Your session expired. Please sign in again.",
    notFound: "We couldn't find what you requested.",
    permissionDenied: "You don't have permission to do that.",
    smsSendFailed: "SMS provider rejected the request. Please check the SMS access key in Supabase.",
    purchaseCancelled: "Purchase cancelled.",
    purchaseNotAllowed: "Purchases are not allowed on this device.",
    purchaseFailed: "Purchase failed. Please try again.",
    restoreFailed: "Restore failed. Please try again.",
    uploadFailed: "Upload failed. Please try again."
  },
  de: {
    title: "Fehler",
    unknown: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    network: "Keine Verbindung. Bitte überprüfe dein Internet.",
    authRequired: "Bitte melde dich erneut an.",
    invalidEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
    invalidPassword: "Passwort zu schwach. Bitte wähle ein stärkeres Passwort.",
    invalidCredentials: "E-Mail oder Passwort ist falsch.",
    emailNotConfirmed: "Bitte bestätige zuerst deine E-Mail.",
    rateLimited: "Zu viele Versuche. Bitte warte kurz und versuche es erneut.",
    sessionExpired: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
    notFound: "Das wurde nicht gefunden.",
    permissionDenied: "Dafür hast du keine Berechtigung.",
    smsSendFailed: "SMS-Provider lehnt die Anfrage ab. Bitte den Access-Key in Supabase prüfen.",
    purchaseCancelled: "Kauf abgebrochen.",
    purchaseNotAllowed: "Käufe sind auf diesem Gerät nicht erlaubt.",
    purchaseFailed: "Kauf fehlgeschlagen. Bitte erneut versuchen.",
    restoreFailed: "Wiederherstellen fehlgeschlagen. Bitte erneut versuchen.",
    uploadFailed: "Upload fehlgeschlagen. Bitte erneut versuchen."
  },
  fr: {
    title: "Erreur",
    unknown: "Un problème est survenu. Réessaie.",
    network: "Connexion indisponible. Vérifie ta connexion.",
    authRequired: "Reconnecte-toi.",
    invalidEmail: "Merci d'entrer une adresse e-mail valide.",
    invalidPassword: "Mot de passe trop faible. Choisis-en un plus fort.",
    invalidCredentials: "E-mail ou mot de passe incorrect.",
    emailNotConfirmed: "Merci de confirmer ton e-mail avant de te connecter.",
    rateLimited: "Trop de tentatives. Patiente un instant.",
    sessionExpired: "Ta session a expiré. Reconnecte-toi.",
    notFound: "Élément introuvable.",
    permissionDenied: "Tu n'as pas l'autorisation.",
    smsSendFailed: "Le fournisseur SMS a refusé la requête. Vérifie la clé d'accès dans Supabase.",
    purchaseCancelled: "Achat annulé.",
    purchaseNotAllowed: "Les achats ne sont pas autorisés sur cet appareil.",
    purchaseFailed: "Échec de l'achat. Réessaie.",
    restoreFailed: "Échec de la restauration. Réessaie.",
    uploadFailed: "Échec de l'envoi. Réessaie."
  },
  ru: {
    title: "Ошибка",
    unknown: "Что-то пошло не так. Попробуйте снова.",
    network: "Нет соединения. Проверьте интернет.",
    authRequired: "Пожалуйста, войдите снова.",
    invalidEmail: "Введите корректный адрес e-mail.",
    invalidPassword: "Слишком слабый пароль. Выберите более надежный.",
    invalidCredentials: "Неверный e-mail или пароль.",
    emailNotConfirmed: "Подтвердите e-mail перед входом.",
    rateLimited: "Слишком много попыток. Подождите и попробуйте снова.",
    sessionExpired: "Сессия истекла. Войдите снова.",
    notFound: "Ничего не найдено.",
    permissionDenied: "Нет прав для этого действия.",
    smsSendFailed: "SMS-провайдер отклонил запрос. Проверьте ключ доступа в Supabase.",
    purchaseCancelled: "Покупка отменена.",
    purchaseNotAllowed: "Покупки на этом устройстве недоступны.",
    purchaseFailed: "Покупка не удалась. Попробуйте снова.",
    restoreFailed: "Не удалось восстановить покупку. Попробуйте снова.",
    uploadFailed: "Не удалось загрузить. Попробуйте снова."
  }
};

export const useErrorCopy = () => useLocalizedCopy(errorTranslations);

export const getErrorCopy = (): ErrorCopy => {
  const locale = getCurrentLocale();
  return errorTranslations[locale] ?? errorTranslations.en;
};

const normalizeCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

const extractCode = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "number") return String(error);
  if (typeof error === "object") {
    const anyError = error as { code?: unknown; errorCode?: unknown; status?: unknown; name?: unknown; message?: unknown };
    return (
      (typeof anyError.code === "string" || typeof anyError.code === "number" ? String(anyError.code) : null) ??
      (typeof anyError.errorCode === "string" || typeof anyError.errorCode === "number" ? String(anyError.errorCode) : null) ??
      (typeof anyError.status === "string" || typeof anyError.status === "number" ? String(anyError.status) : null) ??
      (typeof anyError.name === "string" ? anyError.name : null) ??
      (typeof anyError.message === "string" ? anyError.message : null)
    );
  }
  return null;
};

const isNetworkError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const anyError = error as { name?: unknown; message?: unknown };
  const name = typeof anyError.name === "string" ? anyError.name.toLowerCase() : "";
  const message = typeof anyError.message === "string" ? anyError.message.toLowerCase() : "";
  return (
    name.includes("abort") ||
    name.includes("timeout") ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    (message.includes("network") && message.includes("failed"))
  );
};

const matchesCode = (normalized: string, candidates: string[]) => candidates.includes(normalized);

export const getErrorKey = (error: unknown): keyof ErrorCopy | null => {
  if (!error) return null;
  const anyError = error as { userCancelled?: boolean };
  if (anyError.userCancelled) return "purchaseCancelled";
  if (isNetworkError(error)) return "network";

  const rawCode = extractCode(error);
  if (!rawCode) return null;
  const normalized = normalizeCode(rawCode);

  if (matchesCode(normalized, ["AUTH_REQUIRED", "UNAUTHORIZED", "NOT_AUTHENTICATED", "NOT_SIGNED_IN", "401", "INVALID_JWT"])) {
    return "authRequired";
  }
  if (matchesCode(normalized, ["INVALID_EMAIL", "INVALID_EMAIL_ADDRESS", "EMAIL_NOT_AVAILABLE"])) {
    return "invalidEmail";
  }
  if (matchesCode(normalized, ["INVALID_CREDENTIALS", "INVALID_LOGIN_CREDENTIALS", "INVALID_GRANT"])) {
    return "invalidCredentials";
  }
  if (matchesCode(normalized, ["WEAK_PASSWORD", "INVALID_PASSWORD", "PASSWORD_TOO_WEAK"])) {
    return "invalidPassword";
  }
  if (matchesCode(normalized, ["EMAIL_NOT_CONFIRMED", "EMAIL_NOT_VERIFIED"])) {
    return "emailNotConfirmed";
  }
  if (matchesCode(normalized, ["RATE_LIMITED", "TOO_MANY_REQUESTS", "OVER_EMAIL_SEND_RATE_LIMIT", "OVER_SMS_SEND_RATE_LIMIT"])) {
    return "rateLimited";
  }
  if (matchesCode(normalized, ["VERIFICATION_SESSION_EXPIRED", "VERIFICATION_SESSION_CLOSED", "SESSION_EXPIRED", "TOKEN_EXPIRED", "OTP_EXPIRED"])) {
    return "sessionExpired";
  }
  if (matchesCode(normalized, ["NOT_FOUND", "PHOTO_NOT_FOUND", "VERIFICATION_SESSION_NOT_FOUND"])) {
    return "notFound";
  }
  if (matchesCode(normalized, ["FORBIDDEN", "PERMISSION_DENIED", "NOT_OWNER", "BLOCKED", "INSUFFICIENT_PERMISSIONS_ERROR"])) {
    return "permissionDenied";
  }
  if (matchesCode(normalized, ["SMS_SEND_FAILED", "SMS_PROVIDER_FAILED", "SMS_PROVIDER_ERROR"])) {
    return "smsSendFailed";
  }
  if (normalized.includes("INCORRECT_ACCESS_KEY")) {
    return "smsSendFailed";
  }
  if (matchesCode(normalized, ["UPLOAD_FAILED", "PHOTO_ASSET_INSERT_FAILED", "BLURRED_UPLOAD_FAILED", "PHOTO_PERMISSION_FAILED", "PHOTO_LIST_FAILED", "INVALID_STORAGE_PATH", "CANNOT_REGISTER_FOREIGN_PHOTO"])) {
    return "uploadFailed";
  }
  if (matchesCode(normalized, ["1", "PURCHASE_CANCELLED_ERROR"])) {
    return "purchaseCancelled";
  }
  if (matchesCode(normalized, ["3", "PURCHASE_NOT_ALLOWED_ERROR"])) {
    return "purchaseNotAllowed";
  }
  if (matchesCode(normalized, ["10", "NETWORK_ERROR", "OFFLINE_CONNECTION_ERROR"])) {
    return "network";
  }
  if (matchesCode(normalized, ["2", "4", "5", "6", "7", "8", "9", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "28", "29", "30", "31", "32", "33", "34", "35", "42"])) {
    return "purchaseFailed";
  }
  return null;
};

export const getErrorMessage = (error: unknown, copy: ErrorCopy, fallback?: string) => {
  const key = getErrorKey(error);
  if (key && copy[key]) {
    return copy[key];
  }
  return fallback ?? copy.unknown;
};

export const getErrorDetails = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;
  const anyError = error as {
    message?: unknown;
    error_description?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
    errorCode?: unknown;
    status?: unknown;
  };
  const rawDetails = [
    typeof anyError.message === "string" ? anyError.message : null,
    typeof anyError.error_description === "string" ? anyError.error_description : null,
    typeof anyError.details === "string" ? anyError.details : null,
    typeof anyError.hint === "string" ? anyError.hint : null
  ].filter((value): value is string => Boolean(value));

  const uniqueDetails = Array.from(new Set(rawDetails));
  const code =
    typeof anyError.code === "string" || typeof anyError.code === "number"
      ? String(anyError.code)
      : typeof anyError.errorCode === "string" || typeof anyError.errorCode === "number"
        ? String(anyError.errorCode)
        : typeof anyError.status === "string" || typeof anyError.status === "number"
          ? String(anyError.status)
          : null;

  if (!uniqueDetails.length && !code) return null;
  const detailText = uniqueDetails.join(" • ");
  return code ? [detailText, `Code: ${code}`].filter(Boolean).join(" • ") : detailText;
};

export const logError = (error: unknown, context?: string) => {
  if (!error) return;
  const label = context ? `[${context}]` : "[error]";
  if (error instanceof Error) {
    console.warn(label, error.message, error);
  } else {
    console.warn(label, error);
  }
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
    return;
  }
  const normalized =
    error instanceof Error
      ? error
      : typeof error === "string"
        ? new Error(error)
        : new Error("Non-Error thrown");
  Sentry.captureException(normalized, {
    tags: context ? { context } : undefined,
    extra: error && typeof error === "object" ? { originalError: error } : undefined
  });
};
