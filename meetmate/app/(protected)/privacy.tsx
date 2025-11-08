import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import { useSessionStore } from "../../store/sessionStore";
import { useSafety } from "../../features/moderation";
import { useToast } from "../../components/ToastProvider";
import { signOut } from "../../features/auth";
import { useTranslation } from "../../lib/i18n";

const PRIVACY_URL = "https://example.com/privacy";
const IMPRINT_URL = "https://example.com/imprint";

const PrivacyScreen = (): JSX.Element => {
  const session = useSessionStore((state) => state.session);
  const supabase = getSupabase();
  const { guardAction } = useSafety();
  const { showToast } = useToast();
  const [exportData, setExportData] = useState<string | null>(null);
  const { t } = useTranslation();

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error(t("errors.notLoggedIn"));
      guardAction();
      const { data, error } = await supabase.functions.invoke("privacy", {
        body: { type: "export", userId: session.user.id },
      });
      if (error) throw error;
      return JSON.stringify(data?.data ?? {}, null, 2);
    },
    onSuccess: (payload) => {
      setExportData(payload);
      showToast(t("privacy.exportSuccess"), "success");
    },
    onError: (error: any) => {
      showToast(error?.message ?? t("privacy.exportFailed"), "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error(t("errors.notLoggedIn"));
      guardAction();
      const { error } = await supabase.functions.invoke("privacy", {
        body: { type: "delete", userId: session.user.id },
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      showToast(t("privacy.deleteInfo"), "info");
      await signOut();
    },
    onError: (error: any) => {
      showToast(error?.message ?? t("privacy.deleteFailed"), "error");
    },
  });

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>{t("errors.notLoggedIn")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("privacy.title")}</Text>
      <Text style={styles.description}>{t("privacy.description")}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("privacy.exportTitle")}</Text>
        <Text style={styles.cardText}>{t("privacy.exportDescription")}</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => exportMutation.mutate()}
          disabled={exportMutation.isLoading}
        >
          {exportMutation.isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("privacy.exportCta")}</Text>
          )}
        </Pressable>
        {exportData ? (
          <View style={styles.exportBox}>
            <Text style={styles.exportTitle}>{t("privacy.exportDataTitle")}</Text>
            <Text style={styles.exportText}>{exportData}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("privacy.deleteTitle")}</Text>
        <Text style={styles.cardText}>{t("privacy.deleteDescription")}</Text>
        <Pressable
          style={[styles.primaryButton, styles.dangerButton]}
          onPress={() => deleteMutation.mutate()}
          disabled={deleteMutation.isLoading}
        >
          {deleteMutation.isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("privacy.deleteCta")}</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.linksRow}>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Text style={styles.link}>{t("privacy.linkPolicy")}</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(IMPRINT_URL)}>
          <Text style={styles.link}>{t("privacy.linkImprint")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
    backgroundColor: "#f7f7f8",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  description: {
    color: "#4b5563",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardText: {
    color: "#4b5563",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dangerButton: {
    backgroundColor: "#dc2626",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  exportBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  exportTitle: {
    fontWeight: "600",
    marginBottom: 6,
  },
  exportText: {
    fontSize: 12,
    color: "#1f2933",
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  link: {
    color: "#2563eb",
    fontWeight: "600",
  },
});

export default PrivacyScreen;
