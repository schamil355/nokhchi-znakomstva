import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { signOut } from "../../features/auth";
import { useSessionStore } from "../../store/sessionStore";
import { useRouter } from "expo-router";
import { useEntitlements } from "../../features/paywall/hooks";
import { useToast } from "../../components/ToastProvider";
import { useTranslation } from "../../lib/i18n";
import { useProfileCompletion } from "../../features/auth/onboarding";

const HomeScreen = (): JSX.Element => {
  const user = useSessionStore((state) => state.user);
  const router = useRouter();
  const { hasEntitlement } = useEntitlements();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { needsVerification } = useProfileCompletion();
  const paywallEnabled = true;

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBoost = () => {
    if (!hasEntitlement("boost")) {
      if (!paywallEnabled) {
        showToast(t("home.toast.boostRegion"), "info");
        return;
      }
      showToast(t("home.toast.boostPremium"), "info");
      router.push("/paywall");
      return;
    }
    showToast(t("home.toast.boostActivated"), "success");
  };

  const handleOpenPaywall = () => {
    if (!paywallEnabled) {
      showToast(t("home.toast.paywallDisabled"), "info");
      return;
    }
    router.push("/paywall");
  };

  const greetingName = user?.email ?? t("home.greetingFallback");

  return (
    <View style={styles.container} testID="home-screen">
      <Text style={styles.title}>{t("home.greeting", { email: greetingName })}</Text>
      <Text style={styles.subtitle}>{t("home.subtitle")}</Text>
      <View style={styles.buttonColumn}>
        <Pressable
          style={[styles.primaryButton, needsVerification && styles.disabledButton]}
          onPress={() =>
            router.push(needsVerification ? "/verification/consent" : "/discovery")
          }
        >
          <Text style={styles.primaryButtonText}>{t("home.buttons.discovery")}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, needsVerification && styles.disabledButton]}
          onPress={() =>
            router.push(needsVerification ? "/verification/consent" : "/matches")
          }
        >
          <Text style={styles.secondaryButtonText}>{t("home.buttons.matches")}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/profile")}>
          <Text style={styles.secondaryButtonText}>{t("home.buttons.profile")}</Text>
        </Pressable>
        {needsVerification ? (
          <Pressable
            style={styles.highlightCard}
            onPress={() => router.push("/verification/consent")}
          >
            <Text style={styles.highlightTitle}>{t("verification.home.ctaTitle")}</Text>
            <Text style={styles.highlightText}>{t("verification.home.ctaSubtitle")}</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.secondaryButton}
          onPress={handleOpenPaywall}
          testID="home-paywall-button"
        >
          <Text style={styles.secondaryButtonText}>{t("home.buttons.paywall")}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={handleBoost}>
          <Text style={styles.secondaryButtonText}>{t("home.buttons.boost")}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/privacy")}>
          <Text style={styles.secondaryButtonText}>{t("home.buttons.privacy")}</Text>
        </Pressable>
        {__DEV__ ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/debug-entitlements")}
            testID="home-debug-button"
          >
            <Text style={styles.secondaryButtonText}>{t("home.buttons.debug")}</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>{t("home.buttons.signOut")}</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f0f4ff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonColumn: {
    width: "100%",
    maxWidth: 260,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "#2563eb",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  highlightCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2563eb",
    padding: 16,
    backgroundColor: "#eff6ff",
  },
  highlightTitle: {
    color: "#1d4ed8",
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  highlightText: {
    color: "#1e293b",
    textAlign: "center",
  },
});

export default HomeScreen;
