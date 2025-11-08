import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getSupabase } from "../../lib/supabase";
import { useSessionStore } from "../../store/sessionStore";
import { useTranslation } from "../../lib/i18n";

type Params = {
  access_token?: string | string[];
  refresh_token?: string | string[];
  error_description?: string | string[];
  type?: string | string[];
};

const MagicLinkConfirmScreen = (): JSX.Element => {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const setSession = useSessionStore((state) => state.setSession);
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>(t("auth.magicLinkConfirm.verifying"));

  useEffect(() => {
    const accessToken = Array.isArray(params.access_token)
      ? params.access_token[0]
      : params.access_token;
    const refreshToken = Array.isArray(params.refresh_token)
      ? params.refresh_token[0]
      : params.refresh_token;
    const errorDescription = Array.isArray(params.error_description)
      ? params.error_description[0]
      : params.error_description;

    if (errorDescription) {
      setStatus("error");
      setMessage(errorDescription);
      return;
    }

    if (!accessToken || !refreshToken) {
      setStatus("error");
      setMessage(t("auth.magicLinkConfirm.invalidLink"));
      return;
    }

    const supabase = getSupabase();
    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ data, error }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }
        setSession(data.session ?? null);
        setStatus("success");
        setMessage(t("auth.magicLinkConfirm.successMessage"));
        setTimeout(() => {
          router.replace("/");
        }, 1200);
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err?.message ?? t("auth.magicLinkConfirm.fallbackError"));
      });
  }, [params, router, setSession, t]);

  const handleBack = () => {
    router.replace("/sign-in");
  };

  return (
    <View style={styles.container}>
      {status === "loading" ? <ActivityIndicator size="large" /> : null}
      <Text style={styles.title}>
        {status === "success"
          ? t("auth.magicLinkConfirm.successTitle")
          : status === "error"
            ? t("auth.magicLinkConfirm.errorTitle")
            : t("auth.magicLinkConfirm.loadingTitle")}
      </Text>
      <Text style={styles.message}>{message}</Text>
      {status === "error" ? (
        <Pressable style={styles.button} onPress={handleBack}>
          <Text style={styles.buttonText}>{t("auth.magicLinkConfirm.backToLogin")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f7f7f8",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: "#1f2933",
    textAlign: "center",
  },
  button: {
    marginTop: 20,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default MagicLinkConfirmScreen;
