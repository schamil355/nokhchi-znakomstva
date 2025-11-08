import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { forgotPasswordSchema, requestPasswordReset } from "../../features/auth";
import type { z } from "zod";
import { useTranslation } from "../../lib/i18n";

type ForgotForm = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordScreen = (): JSX.Element => {
  const [form, setForm] = useState<ForgotForm>({ email: "" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    const result = forgotPasswordSchema.safeParse(form);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      if (flat.email?.[0]) {
        setError(t(flat.email[0]));
      }
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(result.data);
      setMessage(t("auth.forgotPassword.success"));
    } catch (err: any) {
      setError(err?.message ?? t("auth.forgotPassword.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("auth.forgotPassword.title")}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholder={t("common.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(text) => setForm({ email: text })}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.primaryButton, loading && styles.disabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t("auth.forgotPassword.submit")}</Text>
        )}
      </Pressable>

      <Link href="/sign-in" style={styles.linkText}>
        {t("auth.forgotPassword.goToSignIn")}
      </Link>

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
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.7,
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "600",
    textAlign: "center",
  },
  message: {
    marginTop: 16,
    textAlign: "center",
    color: "#1f2933",
  },
});

export default ForgotPasswordScreen;
