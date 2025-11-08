import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next, useTranslation as useTranslationBase } from "react-i18next";
import * as Localization from "expo-localization";
import { getSupabase } from "./supabase";
import { useSessionStore } from "../store/sessionStore";
import en from "../locales/en";
import de from "../locales/de";
import fr from "../locales/fr";
import ru from "../locales/ru";
import nb from "../locales/nb";
import nlBE from "../locales/nl-BE";

export type SupportedLocale = "en" | "de" | "fr" | "ru" | "nb" | "nl-BE";

const resources = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  ru: { translation: ru },
  nb: { translation: nb },
  "nl-BE": { translation: nlBE },
} as const;

const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "de", "fr", "ru", "nb", "nl-BE"];

type LocaleMap = Record<string, SupportedLocale>;

const NORMALIZE_MAP: LocaleMap = {
  en: "en",
  "en-US": "en",
  "en-GB": "en",
  "en-us": "en",
  "en-gb": "en",
  de: "de",
  "de-DE": "de",
  "de-AT": "de",
  "de-CH": "de",
  "de-de": "de",
  "de-at": "de",
  "de-ch": "de",
  "en-CA": "en",
  "en-au": "en",
  "en-ca": "en",
  fr: "fr",
  "fr-FR": "fr",
  "fr-CA": "fr",
  "fr-fr": "fr",
  ru: "ru",
  "ru-RU": "ru",
  "ru-ru": "ru",
  nb: "nb",
  "nb-NO": "nb",
  "nb-no": "nb",
  no: "nb",
  "no-NO": "nb",
  "no-no": "nb",
  "nl-BE": "nl-BE",
  "nl-be": "nl-BE",
  nl: "nl-BE",
  "nl-NL": "nl-BE",
};

const ensureInitialized = (): I18nInstance => {
  if (!i18next.isInitialized) {
    i18next.use(initReactI18next).init({
      compatibilityJSON: "v4",
      resources,
      lng: "en",
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
  }
  return i18next;
};

const normalizeLocale = (locale?: string | null): SupportedLocale | null => {
  if (!locale) return null;
  const trimmed = locale.trim();
  if (!trimmed) return null;
  const canonical = trimmed.replace("_", "-");
  const direct = NORMALIZE_MAP[canonical];
  if (direct) {
    return direct;
  }
  const lowered = canonical.toLowerCase();
  return NORMALIZE_MAP[lowered] ?? null;
};

const fetchProfileLocale = async (userId: string): Promise<string | null> => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from<{ locale: string | null }>("profiles")
      .select("locale")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("Failed to read profile locale", error);
      return null;
    }
    return data?.locale ?? null;
  } catch (error) {
    console.warn("Profile locale lookup failed", error);
    return null;
  }
};

const detectPreferredLocale = async (): Promise<SupportedLocale> => {
  const session = useSessionStore.getState().session;
  if (session?.user.id) {
    const profileLocale = await fetchProfileLocale(session.user.id);
    const normalizedProfile = normalizeLocale(profileLocale);
    if (normalizedProfile) {
      return normalizedProfile;
    }
  }

  const deviceLocale = Localization.locale ?? Localization.locales?.[0];
  const normalizedDevice = normalizeLocale(deviceLocale);
  return normalizedDevice ?? "en";
};

let syncPromise: Promise<void> | null = null;

export const initI18n = async (): Promise<I18nInstance> => {
  ensureInitialized();
  await syncLocale();
  return i18next;
};

export const syncLocale = async (): Promise<void> => {
  ensureInitialized();
  if (!syncPromise) {
    syncPromise = (async () => {
      const target = await detectPreferredLocale();
      if (i18next.language !== target) {
        await i18next.changeLanguage(target);
      }
    })().finally(() => {
      syncPromise = null;
    });
  }
  await syncPromise;
};

export const setLocale = async (locale: SupportedLocale): Promise<void> => {
  ensureInitialized();
  const normalized = normalizeLocale(locale) ?? "en";
  if (i18next.language !== normalized) {
    await i18next.changeLanguage(normalized);
  }
  const session = useSessionStore.getState().session;
  if (session?.user.id) {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("profiles")
        .update({ locale: normalized })
        .eq("id", session.user.id);
      if (error) {
        console.warn("Failed to persist locale preference", error);
      }
    } catch (error) {
      console.warn("Persist locale preference failed", error);
    }
  }
};

export const getCurrentLocale = (): SupportedLocale => {
  ensureInitialized();
  const normalized = normalizeLocale(i18next.language) ?? "en";
  return normalized;
};

export const supportedLocales = SUPPORTED_LOCALES;

export const useTranslation: typeof useTranslationBase = (ns?: any, options?: any) => {
  ensureInitialized();
  return useTranslationBase(ns, options);
};

export const t = (...args: Parameters<I18nInstance["t"]>) => {
  ensureInitialized();
  return i18next.t(...args);
};

export const __private__ = {
  normalizeLocale,
  detectPreferredLocale,
  fetchProfileLocale,
};
