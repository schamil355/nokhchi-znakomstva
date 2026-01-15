import { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { z } from "zod";
import { Platform } from "react-native";
import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { useAuthStore } from "../state/authStore";
import { ProfileInput, upsertProfile, fetchProfile } from "./profileService";
import { usePreferencesStore } from "../state/preferencesStore";
import { useNotificationsStore } from "../state/notificationsStore";
import { getCurrentLocale } from "../localization/LocalizationProvider";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().min(2).max(32),
  birthday: z.string(),
  gender: z.string(),
  intention: z.string()
});

const authLimiter = createRateLimiter({ intervalMs: 5_000, maxCalls: 3 });

const authCopy: Record<string, Record<string, string>> = {
  en: {
    signInFailed: "Sign in failed",
    confirmEmail: "Please confirm your email before signing in.",
    networkSlow: "Network is slow or unavailable. Please try again."
  },
  de: {
    signInFailed: "Anmeldung fehlgeschlagen",
    confirmEmail: "Bitte bestätige zuerst deine E-Mail, bevor du dich anmeldest.",
    networkSlow: "Netzwerk langsam oder nicht erreichbar. Bitte später erneut versuchen."
  },
  fr: {
    signInFailed: "Échec de la connexion",
    confirmEmail: "Merci de confirmer ton e-mail avant de te connecter.",
    networkSlow: "Réseau lent ou indisponible. Réessaie plus tard."
  },
  ru: {
    signInFailed: "Не удалось войти",
    confirmEmail: "Пожалуйста, подтвердите свою почту перед входом.",
    networkSlow: "Сеть недоступна или медленная. Повторите попытку позже."
  }
};

const tAuth = (key: keyof typeof authCopy.en) => {
  const locale = getCurrentLocale();
  return authCopy[locale]?.[key] ?? authCopy.en[key];
};

const withCode = (code: string, message?: string) => Object.assign(new Error(message ?? code), { code });

export const getEmailRedirectUrl = (): string => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/auth/callback`;
    }
  }
  const fromEnv = process.env.EXPO_PUBLIC_EMAIL_REDIRECT_URL;
  const fromConfig = (Constants.expoConfig as any)?.extra?.emailRedirectUrl;
  return fromEnv || fromConfig || "meetmate://auth/callback";
};

export const signInWithPassword = async (email: string, password: string): Promise<Session> =>
  authLimiter(async () => {
    try {
      const supabase = getSupabaseClient();
      const { email: parsedEmail, password: parsedPassword } = credentialsSchema.parse({ email, password });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsedEmail,
        password: parsedPassword
      });

      if (error || !data.session) {
        throw error ?? new Error(tAuth("signInFailed"));
      }

      // Require confirmed email (if Supabase confirm-email is enabled, session may still appear briefly)
      if (!data.session.user.email_confirmed_at) {
        await supabase.auth.signOut();
        throw withCode("EMAIL_NOT_CONFIRMED", tAuth("confirmEmail"));
      }

      useAuthStore.getState().setSession(data.session);
      usePreferencesStore.getState().setActiveUser(data.session.user.id);
      let profile = await fetchProfile(data.session.user.id);
      if (!profile) {
        // Fallback: minimal Profil anlegen, damit der Profil-Tab nicht hängt
        const userMeta = data.session.user.user_metadata ?? {};
        const displayName =
          userMeta.display_name ||
          userMeta.full_name ||
          data.session.user.email?.split("@")[0] ||
          "User";
        profile = await upsertProfile(data.session.user.id, {
          displayName,
          birthday: "1990-01-01",
          bio: "",
          gender: (userMeta.gender as any) || "nonbinary",
          intention: (userMeta.intention as any) || "serious",
          interests: [],
          photos: [],
          primaryPhotoId: null,
          primaryPhotoPath: null
        });
      }
      useAuthStore.getState().setProfile(profile);

      return data.session;
    } catch (error: any) {
      if (isAbortError(error) || (typeof error?.message === "string" && error.message.toLowerCase().includes("network request failed"))) {
        throw withCode("NETWORK", tAuth("networkSlow"));
      }
      throw error;
    }
  });

export const signUpWithPassword = async (
  payload: z.infer<typeof registerSchema> & { profile: ProfileInput }
): Promise<Session | null> =>
  authLimiter(async () => {
    try {
      const supabase = getSupabaseClient();
      const parsed = registerSchema.parse(payload);
      const { data, error } = await supabase.auth.signUp({
        email: parsed.email,
        password: parsed.password,
        options: {
          data: {
            display_name: parsed.displayName,
            gender: parsed.gender,
            intention: parsed.intention,
            birthday: parsed.birthday
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        if (!data.session.user.email_confirmed_at) {
          // Wenn Bestätigung nötig ist, sofort wieder abmelden und Hinweis geben
          await supabase.auth.signOut();
          throw withCode("EMAIL_NOT_CONFIRMED", tAuth("confirmEmail"));
        }
        useAuthStore.getState().setSession(data.session);
        usePreferencesStore.getState().setActiveUser(data.session.user.id);
        await upsertProfile(data.session.user.id, payload.profile);
        return data.session;
      }

      // Kein Session-Token => Supabase wartet auf E-Mail-Bestätigung
      throw withCode("EMAIL_NOT_CONFIRMED", tAuth("confirmEmail"));
    } catch (error: any) {
      console.error("signUpWithPassword error", error);
      if (isAbortError(error) || (typeof error?.message === "string" && error.message.toLowerCase().includes("network request failed"))) {
        throw withCode("NETWORK", tAuth("networkSlow"));
      }
      throw error;
    }
  });

export const signOut = async () => {
  const supabase = getSupabaseClient();
  const { data: current } = await supabase.auth.getSession();
  // Wenn keine Session vorhanden ist, Zustand trotzdem aufräumen, ohne Fehler zu werfen.
  if (current?.session) {
    const { error } = await supabase.auth.signOut();
    if (error && !String(error.message ?? "").toLowerCase().includes("session missing")) {
      throw error;
    }
  }
  useAuthStore.getState().reset();
  usePreferencesStore.getState().setActiveUser(null);
  useNotificationsStore.getState().clear();
};

const isAbortError = (error: any) =>
  Boolean(error) &&
  (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    error.name === "DOMException" ||
    (typeof error.message === "string" &&
      (error.message.toLowerCase().includes("aborted") || error.message.toLowerCase().includes("network request failed")))
  );

export const bootstrapSession = async (): Promise<Session | null> => {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (isAbortError(error)) {
        return null;
      }
      console.warn("Failed to restore session", error);
      return null;
    }

    if (!data.session) {
      return null;
    }

    useAuthStore.getState().setSession(data.session);
    usePreferencesStore.getState().setActiveUser(data.session.user.id);
    let profile = await fetchProfile(data.session.user.id);
    if (!profile) {
      const userMeta = data.session.user.user_metadata ?? {};
      const displayName =
        userMeta.display_name ||
        userMeta.full_name ||
        data.session.user.email?.split("@")[0] ||
        "User";
      profile = await upsertProfile(data.session.user.id, {
        displayName,
        birthday: "1990-01-01",
        bio: "",
        gender: (userMeta.gender as any) || "nonbinary",
        intention: (userMeta.intention as any) || "serious",
        interests: [],
        photos: [],
        primaryPhotoId: null,
        primaryPhotoPath: null
      });
    }
    useAuthStore.getState().setProfile(profile);

    return data.session;
  } catch (error) {
    if (isAbortError(error)) {
      // Network timeout/abort – treat as no session without loud logging.
      return null;
    }
    console.warn("Failed to restore session", error);
    return null;
  }
};
