import { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { useAuthStore } from "../state/authStore";
import { ProfileInput, upsertProfile, fetchProfile } from "./profileService";

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

export const signInWithPassword = async (email: string, password: string): Promise<Session> =>
  authLimiter(async () => {
    const supabase = getSupabaseClient();
    const { email: parsedEmail, password: parsedPassword } = credentialsSchema.parse({ email, password });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsedEmail,
      password: parsedPassword
    });

    if (error || !data.session) {
      throw error ?? new Error("Anmeldung fehlgeschlagen");
    }

    useAuthStore.getState().setSession(data.session);
    const profile = await fetchProfile(data.session.user.id);
    if (profile) {
      useAuthStore.getState().setProfile(profile);
    }

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
      useAuthStore.getState().setSession(data.session);
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
};

export const bootstrapSession = async (): Promise<Session | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("Failed to restore session", error);
    return null;
  }

  if (!data.session) {
    return null;
  }

  useAuthStore.getState().setSession(data.session);
  const profile = await fetchProfile(data.session.user.id);
  if (profile) {
    useAuthStore.getState().setProfile(profile);
  }

  return data.session;
};
