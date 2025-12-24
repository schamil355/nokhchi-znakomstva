import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useOnboardingStore } from "../state/onboardingStore";
import {
  fetchPushToken,
  sendTokenToBackend,
  sendExpoTestPush,
  verifyDeviceRow,
  type PushStatus
} from "../lib/push";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};
const IS_DEV = __DEV__;

type Props = NativeStackScreenProps<any>;

const translations = {
  en: {
    titleAccent: "Enable notifications,",
    title: "don't miss out!",
    subtitleUnavailable: "Notifications are not available on this device.",
    activate: "Enable notifications",
    skip: "Later",
    settings: "Open settings",
    back: "Back",
    statusGranted: "Notifications were enabled.",
    statusProvisional: "Notifications are provisionally enabled.",
    statusDenied: "Notifications were denied. You can allow them anytime in Settings.",
    statusBlocked: "Notifications are blocked. Please open Settings to allow them.",
    statusUnavailable: "Notifications are not available on this device.",
    errorGeneric: "Notifications couldn't be enabled. Please try again.",
    supabaseButton: "Check Supabase",
    supabaseLoading: "Checking Supabase...",
    supabaseSuccess: "✅ Stored in Supabase",
    supabaseMissing: "❌ No entry found in public.devices",
    testPushButton: "Send test push",
    testPushLoading: "Sending test push...",
    testPushSuccess: (ticket?: string) =>
      `Test push sent${ticket ? ` (Ticket: ${ticket})` : ""}`,
    testPushError: "Push could not be sent.",
    localNotification: "Test local notification",
    continue: "Continue to step 5",
    devTitle: "DEV tools",
    tokenLabel: "Token",
    permissionHint: "Opens the system prompt for notifications",
    supabaseNoToken: "No token available.",
    pushNoToken: "No token available."
  },
  de: {
    titleAccent: "Benachrichtigungen aktivieren,",
    title: "lass sie dir nicht entgehen!",
    subtitleUnavailable: "Benachrichtigungen sind auf diesem Gerät nicht verfügbar.",
    activate: "Benachrichtigungen aktivieren",
  skip: "Später",
    settings: "Einstellungen öffnen",
    back: "Zurück",
    statusGranted: "Benachrichtigungen wurden aktiviert.",
    statusProvisional: "Benachrichtigungen sind vorläufig aktiviert.",
    statusDenied: "Benachrichtigungen wurden abgelehnt. Du kannst sie jederzeit in den Einstellungen aktivieren.",
    statusBlocked: "Benachrichtigungen sind blockiert. Bitte öffne die Einstellungen, um sie freizugeben.",
    statusUnavailable: "Benachrichtigungen sind auf diesem Gerät nicht verfügbar.",
    errorGeneric: "Benachrichtigungen konnten nicht aktiviert werden. Bitte versuche es erneut.",
    supabaseButton: "Supabase prüfen",
    supabaseLoading: "Prüfe Supabase...",
    supabaseSuccess: "✅ In Supabase gespeichert",
    supabaseMissing: "❌ Kein Eintrag in public.devices gefunden",
    testPushButton: "Test-Push senden",
    testPushLoading: "Sende Test-Push...",
    testPushSuccess: (ticket?: string) =>
      `Test-Push gesendet${ticket ? ` (Ticket: ${ticket})` : ""}`,
    testPushError: "Push konnte nicht gesendet werden.",
    localNotification: "Lokale Notification testen",
    continue: "Weiter zu Schritt 5",
    devTitle: "DEV-Tools",
    tokenLabel: "Token",
    permissionHint: "Öffnet das Benachrichtigungs-Prompt des Systems",
    supabaseNoToken: "Kein Token vorhanden.",
    pushNoToken: "Kein Token vorhanden."
  },
  fr: {
    titleAccent: "Active les notifications,",
    title: "ne rate rien d'important !",
    subtitleUnavailable: "Les notifications ne sont pas disponibles sur cet appareil.",
    activate: "Activer les notifications",
    skip: "Plus tard",
    settings: "Ouvrir les réglages",
    back: "Retour",
    statusGranted: "Les notifications sont activées.",
    statusProvisional: "Les notifications sont activées temporairement.",
    statusDenied: "Les notifications ont été refusées. Tu peux les autoriser dans les réglages.",
    statusBlocked: "Les notifications sont bloquées. Ouvre les réglages pour les autoriser.",
    statusUnavailable: "Les notifications ne sont pas disponibles sur cet appareil.",
    errorGeneric: "Impossible d'activer les notifications. Réessaie.",
    supabaseButton: "Vérifier Supabase",
    supabaseLoading: "Vérification de Supabase...",
    supabaseSuccess: "✅ Enregistré dans Supabase",
    supabaseMissing: "❌ Aucune entrée trouvée dans public.devices",
    testPushButton: "Envoyer un push test",
    testPushLoading: "Envoi du push...",
    testPushSuccess: (ticket?: string) =>
      `Push test envoyé${ticket ? ` (ticket : ${ticket})` : ""}`,
    testPushError: "Impossible d'envoyer le push.",
    localNotification: "Tester une notification locale",
    continue: "Continuer vers l'étape 5",
    devTitle: "Outils DEV",
    tokenLabel: "Token",
    permissionHint: "Ouvre la demande système pour les notifications",
    supabaseNoToken: "Aucun token disponible.",
    pushNoToken: "Aucun token disponible."
  },
  ru: {
    titleAccent: "Включи уведомления,",
    title: "не пропусти ничего важного!",
    subtitleUnavailable: "Уведомления недоступны на этом устройстве.",
    activate: "Включить уведомления",
    skip: "Позже",
    settings: "Открыть настройки",
    back: "Назад",
    statusGranted: "Уведомления включены.",
    statusProvisional: "Уведомления включены временно.",
    statusDenied: "Уведомления отклонены. Ты можешь разрешить их в настройках.",
    statusBlocked: "Уведомления заблокированы. Открой настройки, чтобы разрешить.",
    statusUnavailable: "Уведомления недоступны на этом устройстве.",
    errorGeneric: "Не удалось включить уведомления. Попробуй ещё раз.",
    supabaseButton: "Проверить Supabase",
    supabaseLoading: "Проверяю Supabase...",
    supabaseSuccess: "✅ Сохранено в Supabase",
    supabaseMissing: "❌ Запись в public.devices не найдена",
    testPushButton: "Отправить тестовый пуш",
    testPushLoading: "Отправляю пуш...",
    testPushSuccess: (ticket?: string) =>
      `Тестовый пуш отправлен${ticket ? ` (ticket: ${ticket})` : ""}`,
    testPushError: "Не удалось отправить пуш.",
    localNotification: "Проверить локальное уведомление",
    continue: "Далее к шагу 5",
    devTitle: "DEV-инструменты",
    tokenLabel: "Токен",
    permissionHint: "Откроет системный запрос на уведомления",
    supabaseNoToken: "Нет токена.",
    pushNoToken: "Нет токена."
  }
};

const OnboardingNotificationsScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const name = useOnboardingStore((state) => state.name);
  const dob = useOnboardingStore((state) => state.dob);
  const setNotifications = useOnboardingStore((state) => state.setNotifications);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(copy.subtitleUnavailable);
  const [permissionStatus, setPermissionStatus] = useState<PushStatus | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [devHarnessActive, setDevHarnessActive] = useState(false);
  const [supabaseState, setSupabaseState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [supabaseMessage, setSupabaseMessage] = useState<string | null>(null);
  const [pushState, setPushState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedGender) {
      navigation.replace("OnboardingGender");
      return;
    }
    if (!name.trim()) {
      navigation.replace("OnboardingName");
      return;
    }
    if (!dob) {
      navigation.replace("OnboardingBirthday");
    }
  }, [dob, name, navigation, selectedGender]);

  const getStatusCopy = (status: PushStatus) => {
    switch (status) {
      case "granted":
        return copy.statusGranted;
      case "provisional":
        return copy.statusProvisional;
      case "denied":
        return copy.statusDenied;
      case "blocked":
        return copy.statusBlocked;
      case "unavailable":
      default:
        return copy.statusUnavailable;
    }
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    setStatusMessage(null);
    setSupabaseState("idle");
    setPushState("idle");
    setSupabaseMessage(null);
    setPushMessage(null);
    try {
      const result = await fetchPushToken();
      setPermissionStatus(result.status);
      setStatusMessage(getStatusCopy(result.status));
      setNotifications({ status: result.status, token: result.token ?? null });
      if (result.token) {
        setToken(result.token);
        if (IS_DEV) {
          console.log("[Push] Expo token", `${result.token.slice(0, 10)}…`);
        }
        await sendTokenToBackend(result.token, "expo");
      } else {
        setToken(null);
      }

      if (result.status === "granted" || result.status === "provisional") {
        if (IS_DEV) {
          setDevHarnessActive(true);
        } else {
          navigation.navigate("OnboardingLocation");
        }
      }
    } catch (error) {
      console.error("[Push] enable error", error);
      setStatusMessage(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySupabase = async () => {
    if (!token) {
      setSupabaseState("error");
      setSupabaseMessage(copy.supabaseNoToken);
      return;
    }
    setSupabaseState("loading");
    setSupabaseMessage(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("Keine aktive Session gefunden.");
      }

      const exists = await verifyDeviceRow(supabase, session.user.id, token);
      if (exists) {
        setSupabaseState("success");
        setSupabaseMessage(copy.supabaseSuccess);
      } else {
        setSupabaseState("error");
        setSupabaseMessage(copy.supabaseMissing);
      }
    } catch (error: any) {
      setSupabaseState("error");
      setSupabaseMessage(error?.message ?? copy.errorGeneric);
    }
  };

  const handleSendTestPush = async () => {
    setPushState("loading");
    setPushMessage(null);
    try {
      await sendExpoTestPush();
      setPushState("success");
      setPushMessage(copy.testPushSuccess());
    } catch (error: any) {
      setPushState("error");
      setPushMessage(error?.message ?? copy.testPushError);
      console.error("[Push] test send error", error);
    }
  };

  const handleLocalTest = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Lokaler Test",
        body: "Das Gerät kann Benachrichtigungen darstellen.",
        data: { source: "onboarding-step4-local" }
      },
      trigger: null
    });
  };

  const continueToNext = () => {
    navigation.navigate("OnboardingLocation");
  };

  const showSettingsCta =
    permissionStatus === "blocked" || permissionStatus === "denied" || permissionStatus === "unavailable";
  const showDevTools = IS_DEV && devHarnessActive;

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="chevron-back" size={24} color={PALETTE.gold} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitleAccent}>{copy.titleAccent}</Text>
          <Text style={styles.heroTitle}>{copy.title}</Text>
        </View>

        {statusMessage && (
          <Text style={styles.statusMessage} accessibilityLiveRegion="polite">
            {statusMessage}
          </Text>
        )}

        {showSettingsCta && (
          <Pressable
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel={copy.settings}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
          >
            <Text style={styles.settingsButtonText}>{copy.settings}</Text>
          </Pressable>
        )}

        {showDevTools && (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>{copy.devTitle}</Text>
            <Text style={styles.devSubtitle}>
              {copy.tokenLabel}: {token ? `${token.slice(0, 12)}…` : "—"} ({permissionStatus ?? "n/a"})
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.devButton,
                supabaseState === "loading" && styles.devButtonDisabled,
                pressed && styles.devButtonPressed
              ]}
              disabled={supabaseState === "loading"}
              onPress={handleVerifySupabase}
            >
              <Text style={styles.devButtonText}>
                {supabaseState === "loading" ? copy.supabaseLoading : copy.supabaseButton}
              </Text>
            </Pressable>
            {supabaseMessage && <Text style={styles.devMessage}>{supabaseMessage}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.devButton,
                pushState === "loading" && styles.devButtonDisabled,
                pressed && styles.devButtonPressed
              ]}
              disabled={pushState === "loading"}
              onPress={handleSendTestPush}
            >
              <Text style={styles.devButtonText}>
                {pushState === "loading" ? copy.testPushLoading : copy.testPushButton}
              </Text>
            </Pressable>
            {pushMessage && <Text style={styles.devMessage}>{pushMessage}</Text>}

            <Pressable
              style={({ pressed }) => [styles.devButton, pressed && styles.devButtonPressed]}
              onPress={handleLocalTest}
            >
              <Text style={styles.devButtonText}>{copy.localNotification}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.devContinueButton, pressed && styles.devButtonPressed]}
              onPress={continueToNext}
            >
              <Text style={styles.devContinueText}>{copy.continue}</Text>
            </Pressable>
          </View>
        )}
      </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleEnableNotifications}
            disabled={loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
            accessibilityHint={copy.permissionHint}
            style={({ pressed }) => [
              styles.primaryButton,
              loading && styles.primaryButtonDisabled,
              pressed && !loading && styles.primaryButtonPressed
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                <Text style={styles.primaryButtonText}>{copy.activate}</Text>
              </LinearGradient>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: "transparent"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  backButtonPressed: {
    opacity: 0.7
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999
  },
  progressFill: {
    width: "80%",
    height: "100%",
    backgroundColor: PALETTE.gold,
    borderRadius: 999
  },
  hero: {
    marginTop: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  heroTitleAccent: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.gold,
    textAlign: "center"
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: PALETTE.sand,
    textAlign: "center",
    marginTop: 4
  },
  statusMessage: {
    marginTop: 24,
    textAlign: "center",
    color: "rgba(242,231,215,0.8)"
  },
  settingsButton: {
    alignSelf: "center",
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  settingsButtonPressed: {
    opacity: 0.85
  },
  settingsButtonText: {
    color: PALETTE.sand,
    fontWeight: "600"
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.select({ ios: 32, default: 24 }),
    backgroundColor: "transparent"
  },
  primaryButton: {
    backgroundColor: "transparent",
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    marginBottom: 12
  },
  primaryInner: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  skipText: {
    textAlign: "center",
    color: "rgba(242,231,215,0.8)",
    fontWeight: "500"
  },
  devSection: {
    marginTop: 32,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)",
    gap: 8
  },
  devTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.sand
  },
  devSubtitle: {
    fontSize: 13,
    color: "rgba(242,231,215,0.85)"
  },
  devButton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    paddingVertical: 10,
    alignItems: "center"
  },
  devButtonDisabled: {
    opacity: 0.6
  },
  devButtonPressed: {
    opacity: 0.85
  },
  devButtonText: {
    color: PALETTE.sand,
    fontWeight: "600"
  },
  devMessage: {
    fontSize: 13,
    color: "rgba(242,231,215,0.85)"
  },
  devContinueButton: {
    marginTop: 8,
    backgroundColor: "transparent",
    paddingVertical: 0,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: PALETTE.gold,
    overflow: "hidden"
  },
  devContinueText: {
    color: "#ffffff",
    fontWeight: "600"
  }
});

export default OnboardingNotificationsScreen;
