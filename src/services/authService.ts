import { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { useAuthStore } from "../state/authStore";
import { upsertProfile, fetchProfile } from "./profileService";
import { usePreferencesStore } from "../state/preferencesStore";
import { useNotificationsStore } from "../state/notificationsStore";
import { getCurrentLocale } from "../localization/LocalizationProvider";

const phoneSchema = z.object({
  phone: z.string().min(3)
});

const authLimiter = createRateLimiter({ intervalMs: 5_000, maxCalls: 3 });

const authCopy: Record<string, Record<string, string>> = {
  en: {
    signInFailed: "Sign in failed",
    networkSlow: "Network is slow or unavailable. Please try again."
  },
  de: {
    signInFailed: "Anmeldung fehlgeschlagen",
    networkSlow: "Netzwerk langsam oder nicht erreichbar. Bitte später erneut versuchen."
  },
  fr: {
    signInFailed: "Échec de la connexion",
    networkSlow: "Réseau lent ou indisponible. Réessaie plus tard."
  },
  ru: {
    signInFailed: "Не удалось войти",
    networkSlow: "Сеть недоступна или медленная. Повторите попытку позже."
  }
};

const tAuth = (key: keyof typeof authCopy.en) => {
  const locale = getCurrentLocale();
  return authCopy[locale]?.[key] ?? authCopy.en[key];
};

const withCode = (code: string, message?: string) => Object.assign(new Error(message ?? code), { code });

const normalizePhone = (value: string) => value.replace(/\s+/g, "");

const getFallbackDisplayName = (user: Session["user"]) => {
  const userMeta = user.user_metadata ?? {};
  const phoneSuffix = user.phone?.replace(/\D/g, "").slice(-4);
  return (
    userMeta.display_name ||
    userMeta.full_name ||
    user.email?.split("@")[0] ||
    (phoneSuffix ? `User ${phoneSuffix}` : "User")
  );
};

export const requestPhoneOtp = async (phone: string): Promise<void> =>
  authLimiter(async () => {
    try {
      const supabase = getSupabaseClient();
      const { phone: parsedPhone } = phoneSchema.parse({ phone });
      const normalizedPhone = normalizePhone(parsedPhone.trim());
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true }
      });
      if (error) {
        throw error;
      }
    } catch (error: any) {
      if (isAbortError(error) || (typeof error?.message === "string" && error.message.toLowerCase().includes("network request failed"))) {
        throw withCode("NETWORK", tAuth("networkSlow"));
      }
      throw error;
    }
  });

type VerifyOtpOptions = {
  createProfileIfMissing?: boolean;
};

type VerifyOtpResult = {
  session: Session;
  profile: ReturnType<typeof fetchProfile> extends Promise<infer T> ? T : null;
};

export const verifyPhoneOtp = async (
  phone: string,
  token: string,
  options: VerifyOtpOptions = {}
): Promise<VerifyOtpResult> =>
  authLimiter(async () => {
    try {
      const supabase = getSupabaseClient();
      const { phone: parsedPhone } = phoneSchema.parse({ phone });
      const normalizedPhone = normalizePhone(parsedPhone.trim());
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: "sms"
      });
      if (error) {
        throw error;
      }
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        throw sessionError ?? new Error(tAuth("signInFailed"));
      }

      useAuthStore.getState().setSession(data.session);
      usePreferencesStore.getState().setActiveUser(data.session.user.id);
      let profile = await fetchProfile(data.session.user.id);
      if (!profile && options.createProfileIfMissing) {
        const userMeta = data.session.user.user_metadata ?? {};
        const displayName = getFallbackDisplayName(data.session.user);
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
      if (profile) {
        useAuthStore.getState().setProfile(profile);
      }

      return { session: data.session, profile };
    } catch (error: any) {
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
      const displayName = getFallbackDisplayName(data.session.user);
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
