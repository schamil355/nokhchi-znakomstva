import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import {
  magicLinkSchema,
  sendMagicLink,
  signInSchema,
  signInWithEmail,
  signInWithOAuth,
} from "../../features/auth";
import type { z } from "zod";
import { useTranslation } from "../../lib/i18n";

type SignInForm = z.infer<typeof signInSchema>;

const SignInScreen = (): JSX.Element => {
  const [form, setForm] = useState<SignInForm>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const { t } = useTranslation();

  const handleChange = (key: keyof SignInForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    setErrors({});
    setMessage(null);
    const result = signInSchema.safeParse(form);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      const flat = result.error.flatten().fieldErrors;
      if (flat.email?.[0]) {
        nextErrors.email = t(flat.email[0]);
      }
      if (flat.password?.[0]) {
        nextErrors.password = t(flat.password[0]);
      }
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await signInWithEmail(result.data);
      setMessage(t("auth.signIn.success"));
    } catch (error: any) {
      setMessage(error?.message ?? t("auth.signIn.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    setErrors({});
    setMessage(null);
    const result = magicLinkSchema.safeParse({ email: form.email });
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      const flat = result.error.flatten().fieldErrors;
      if (flat.email?.[0]) {
        nextErrors.email = t(flat.email[0]);
      }
      setErrors(nextErrors);
      return;
    }

    try {
      setMagicLoading(true);
      await sendMagicLink(result.data);
      setMessage(t("auth.signIn.magicLinkSuccess"));
    } catch (error: any) {
      setMessage(error?.message ?? t("auth.signIn.magicLinkError"));
    } finally {
      setMagicLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      setOauthLoading(provider);
      await signInWithOAuth(provider);
    } catch (error: any) {
      Alert.alert(
        t("auth.signIn.oauthErrorTitle"),
        error?.message ?? t("auth.signIn.oauthErrorMessage"),
      );
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <View style={styles.container} testID="signIn-screen">
      <Text style={styles.title}>{t("auth.signIn.title")}</Text>
      <TextInput
        testID="signIn-email"
        style={[styles.input, errors.email && styles.inputError]}
        placeholder={t("common.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(text) => handleChange("email", text)}
        textContentType="emailAddress"
      />
      {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
      <TextInput
        testID="signIn-password"
        style={[styles.input, errors.password && styles.inputError]}
        placeholder={t("common.password")}
        secureTextEntry
        autoCapitalize="none"
        value={form.password}
        onChangeText={(text) => handleChange("password", text)}
        textContentType="password"
      />
      {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

      <Pressable
        testID="signIn-submit"
        style={[styles.primaryButton, isSubmitting && styles.disabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t("auth.signIn.submit")}</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.secondaryButton, magicLoading && styles.disabled]}
        onPress={handleMagicLink}
        disabled={magicLoading}
      >
        {magicLoading ? (
          <ActivityIndicator color="#1f2933" />
        ) : (
          <Text style={styles.secondaryButtonText}>{t("auth.signIn.magicLink")}</Text>
        )}
      </Pressable>

      <View style={styles.oauthRow}>
        <Pressable
          style={[styles.oauthButton, oauthLoading === "google" && styles.disabled]}
          onPress={() => handleOAuth("google")}
          disabled={oauthLoading !== null}
        >
          {oauthLoading === "google" ? (
            <ActivityIndicator color="#1f2933" />
          ) : (
            <Text style={styles.oauthText}>{t("auth.signIn.google")}</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.oauthButton, oauthLoading === "apple" && styles.disabled]}
          onPress={() => handleOAuth("apple")}
          disabled={oauthLoading !== null}
        >
          {oauthLoading === "apple" ? (
            <ActivityIndicator color="#1f2933" />
          ) : (
            <Text style={styles.oauthText}>{t("auth.signIn.apple")}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.links}>
        <Link href="/sign-up" style={styles.linkText} testID="signIn-goToSignUp">
          {t("auth.signIn.goToSignUp")}
        </Link>
        <Link href="/forgot-password" style={styles.linkText}>
          {t("auth.signIn.goToForgotPassword")}
        </Link>
      </View>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f7f7f8",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  error: {
    color: "#b91c1c",
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  oauthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  oauthButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 14,
    alignItems: "center",
    marginHorizontal: 4,
  },
  oauthText: {
    fontWeight: "600",
    color: "#1f2933",
  },
  links: {
    marginTop: 20,
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  message: {
    marginTop: 16,
    textAlign: "center",
    color: "#1f2933",
  },
});

export default SignInScreen;
