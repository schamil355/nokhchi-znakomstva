import * as AuthSession from "expo-auth-session";
import { Alert } from "react-native";
import { z } from "zod";
import { getSupabase } from "../../lib/supabase";
import { t } from "../../lib/i18n";

export const signInSchema = z.object({
  email: z.string().email("auth.errors.email"),
  password: z.string().min(8, "auth.errors.passwordLength"),
});

export const signUpSchema = z
  .object({
    email: z.string().email("auth.errors.email"),
    password: z.string().min(8, "auth.errors.passwordLength"),
    confirmPassword: z.string().min(8, "auth.errors.passwordLength"),
    displayName: z
      .string()
      .min(2, "auth.errors.displayNameMin")
      .max(50, "auth.errors.displayNameMax"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "auth.errors.passwordMismatch",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("auth.errors.email"),
});

export const magicLinkSchema = z.object({
  email: z.string().email("auth.errors.email"),
});

const redirectTo = AuthSession.makeRedirectUri({
  scheme: "meetmate",
  path: "magic-link-confirm",
});

export const signInWithEmail = async (values: z.infer<typeof signInSchema>) => {
  const supabase = getSupabase();
  const parsed = signInSchema.parse(values);
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email.toLowerCase(),
    password: parsed.password,
  });
  if (error) {
    throw error;
  }
};

export const signUpWithEmail = async (values: z.infer<typeof signUpSchema>) => {
  const supabase = getSupabase();
  const parsed = signUpSchema.parse(values);
  const { email, password, displayName } = parsed;
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data.user ?? null;
};

export const requestPasswordReset = async (
  values: z.infer<typeof forgotPasswordSchema>,
) => {
  const supabase = getSupabase();
  const parsed = forgotPasswordSchema.parse(values);
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.email.toLowerCase(),
    {
      redirectTo,
    },
  );
  if (error) {
    throw error;
  }
};

export const sendMagicLink = async (values: z.infer<typeof magicLinkSchema>) => {
  const supabase = getSupabase();
  const parsed = magicLinkSchema.parse(values);
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.email.toLowerCase(),
    options: {
      emailRedirectTo: redirectTo,
    },
  });
  if (error) {
    throw error;
  }
};

export const signInWithOAuth = async (provider: "google" | "apple") => {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error(t("auth.errors.oauthStart"));
  }

  const authResult = await AuthSession.startAsync({ authUrl: data.url });

  if (authResult.type === "error") {
    throw new Error(authResult.params?.error_description ?? t("auth.errors.oauthFailed"));
  }

  if (authResult.type === "dismiss" || authResult.type === "cancel") {
    throw new Error(t("auth.errors.oauthCancelled"));
  }
};

export const signOut = async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    if (error.message) {
      Alert.alert(
        t("auth.alerts.signOutFailedTitle"),
        error.message ?? t("auth.alerts.signOutFailedMessage"),
      );
    }
    throw error;
  }
};
