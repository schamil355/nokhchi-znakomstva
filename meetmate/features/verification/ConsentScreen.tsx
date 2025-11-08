import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Checkbox from "expo-checkbox";
import { useTranslation } from "../../lib/i18n";
import Button from "../../components/ui/Button";
import { useVerificationFlow } from "./hooks";
import { useVerificationStore } from "./store";

const ConsentScreen = () => {
  const { t } = useTranslation();
  const [consent, setConsent] = useState(false);
  const { startVerification, reset, isStarting } = useVerificationFlow();
  const { status, errorMessage } = useVerificationStore();
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://example.com/privacy";
  const dataPolicyUrl =
    process.env.EXPO_PUBLIC_DATA_POLICY_URL ??
    "https://example.com/verification-security";

  useEffect(() => {
    reset();
  }, [reset]);

  const handleContinue = () => {
    if (!consent || isStarting) return;
    startVerification();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("verification.consent.title")}</Text>
      <Text style={styles.paragraph}>{t("verification.consent.description")}</Text>
      <View style={styles.list}>
        <View style={styles.listItem}>
          <View style={styles.bullet} />
          <Text style={styles.listText}>{t("verification.consent.camera")}</Text>
        </View>
        <View style={styles.listItem}>
          <View style={styles.bullet} />
          <Text style={styles.listText}>{t("verification.consent.otp")}</Text>
        </View>
        <View style={styles.listItem}>
          <View style={styles.bullet} />
          <Text style={styles.listText}>{t("verification.consent.deletion")}</Text>
        </View>
      </View>

      <Pressable style={styles.checkboxRow} onPress={() => setConsent((prev) => !prev)}>
        <Checkbox
          value={consent}
          onValueChange={setConsent}
          color={consent ? "#2563eb" : undefined}
        />
        <Text style={styles.checkboxLabel}>{t("verification.consent.checkbox")}</Text>
      </Pressable>

      <Text style={styles.notice}>{t("verification.consent.notice")}</Text>
      <View style={styles.links}>
        <Pressable onPress={async () => Linking.openURL(privacyUrl)}>
          <Text style={styles.link}>{t("verification.consent.privacyLink")}</Text>
        </Pressable>
        <Pressable onPress={async () => Linking.openURL(dataPolicyUrl)}>
          <Text style={styles.link}>{t("verification.consent.dataPolicyLink")}</Text>
        </Pressable>
      </View>

      {status === "failed" && errorMessage ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : null}

      <Button
        title={t("verification.consent.button")}
        onPress={handleContinue}
        disabled={!consent || isStarting}
        loading={isStarting}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  paragraph: {
    fontSize: 16,
    color: "#334155",
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: "#2563eb",
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: "#1f2933",
  },
  notice: {
    fontSize: 12,
    color: "#64748b",
  },
  links: {
    flexDirection: "row",
    gap: 16,
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  error: {
    color: "#b91c1c",
  },
});

export default ConsentScreen;
