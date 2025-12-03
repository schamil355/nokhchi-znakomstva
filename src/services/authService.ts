import { Session } from "@supabase/supabase-js";
import { z } from "zod";
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
  en: { signInFailed: "Sign in failed" },
  de: { signInFailed: "Anmeldung fehlgeschlagen" },
  fr: { signInFailed: "Échec de la connexion" },
  ru: { signInFailed: "Не удалось войти" }
};

const tAuth = (key: keyof typeof authCopy.en) => {
  const locale = getCurrentLocale();
  return authCopy[locale]?.[key] ?? authCopy.en[key];
};

export const signInWithPassword = async (email: string, password: string): Promise<Session> =>
  authLimiter(async () => {
    const supabase = getSupabaseClient();
    const { email: parsedEmail, password: parsedPassword } = credentialsSchema.parse({ email, password });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsedEmail,
      password: parsedPassword
    });

    if (error || !data.session) {
      throw error ?? new Error(tAuth("signInFailed"));
    }

    useNotificationsStore.getState().clear();
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
  });

export const signUpWithPassword = async (
  payload: z.infer<typeof registerSchema> & { profile: ProfileInput }
): Promise<Session | null> =>
  authLimiter(async () => {
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
      useNotificationsStore.getState().clear();
      useAuthStore.getState().setSession(data.session);
      usePreferencesStore.getState().setActiveUser(data.session.user.id);
      await upsertProfile(data.session.user.id, payload.profile);
      return data.session;
    }

    return null;
  });

export const signOut = async () => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
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
