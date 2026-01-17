import React, { useEffect, useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useOnboardingStore } from "../state/onboardingStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { isAndroidDevice, isIOSDevice, isStandaloneMode } from "../lib/pwa";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

type Props = NativeStackScreenProps<any>;

const translations = {
  en: {
    titleAccent: "Enable notifications,",
    title: "don't miss out!",
    subtitle: "In the web app, notifications work only after adding it to your home screen.",
    howTitle: "How it works",
    iosSteps: "iOS: ⋯ → Share → Add to Home Screen. Then open from the icon and allow notifications.",
    androidSteps: "Android: ⋮ → Add to Home screen. Then open from the icon and allow notifications.",
    desktopSteps: "On desktop browsers, push notifications are not available for this web app.",
    installedNote: "The app is already installed. Open it from the icon and enable notifications in Settings.",
    continue: "Continue",
    back: "Back"
  },
  de: {
    titleAccent: "Benachrichtigungen aktivieren,",
    title: "lass sie dir nicht entgehen!",
    subtitle: "In der Web-App funktionieren Benachrichtigungen nur nach dem Hinzufügen zum Home-Bildschirm.",
    howTitle: "So geht's",
    iosSteps: "iOS: ⋯ → Teilen → Zum Home-Bildschirm. Danach vom Icon öffnen und Benachrichtigungen erlauben.",
    androidSteps: "Android: ⋮ → Zum Startbildschirm hinzufügen. Danach vom Icon öffnen und Benachrichtigungen erlauben.",
    desktopSteps: "Am Desktop sind Push-Benachrichtigungen für diese Web-App nicht verfügbar.",
    installedNote: "Die App ist bereits installiert. Öffne sie vom Icon und aktiviere Benachrichtigungen in den Einstellungen.",
    continue: "Weiter",
    back: "Zurück"
  },
  fr: {
    titleAccent: "Active les notifications,",
    title: "ne rate rien d'important !",
    subtitle: "Dans l'app web, les notifications ne fonctionnent qu'après l'ajout à l'écran d'accueil.",
    howTitle: "Comment faire",
    iosSteps: "iOS : ⋯ → Partager → Sur l'écran d'accueil. Puis ouvre depuis l'icône et autorise les notifications.",
    androidSteps: "Android : ⋮ → Ajouter à l'écran d'accueil. Puis ouvre depuis l'icône et autorise les notifications.",
    desktopSteps: "Sur ordinateur, les notifications push ne sont pas disponibles pour cette app web.",
    installedNote: "L'app est déjà installée. Ouvre-la depuis l'icône et active les notifications dans les réglages.",
    continue: "Continuer",
    back: "Retour"
  },
  ru: {
    titleAccent: "Включи уведомления,",
    title: "не пропусти ничего важного!",
    subtitle: "В веб-версии уведомления работают только после добавления на главный экран.",
    howTitle: "Как включить",
    iosSteps: "iOS: ⋯ → Поделиться → На экран «Домой». Затем открой с иконки и разреши уведомления.",
    androidSteps: "Android: ⋮ → Добавить на главный экран. Затем открой с иконки и разреши уведомления.",
    desktopSteps: "На компьютере push-уведомления для этой веб-версии недоступны.",
    installedNote: "Приложение уже установлено. Открой его с иконки и включи уведомления в настройках.",
    continue: "Далее",
    back: "Назад"
  }
};

const OnboardingNotificationsScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const name = useOnboardingStore((state) => state.name);
  const dob = useOnboardingStore((state) => state.dob);
  const setNotifications = useOnboardingStore((state) => state.setNotifications);

  const isIOS = useMemo(() => isIOSDevice(), []);
  const isAndroid = useMemo(() => isAndroidDevice(), []);
  const isStandalone = useMemo(() => isStandaloneMode(), []);

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

  const stepsText = isStandalone
    ? copy.installedNote
    : isIOS
      ? copy.iosSteps
      : isAndroid
        ? copy.androidSteps
        : copy.desktopSteps;

  const continueToNext = () => {
    setNotifications({ status: "unavailable", token: null });
    navigation.navigate("OnboardingLocation");
  };

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

          <Text style={styles.statusMessage} accessibilityLiveRegion="polite">
            {copy.subtitle}
          </Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>{copy.howTitle}</Text>
            <Text style={styles.noticeBody}>{stepsText}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={continueToNext}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryInner}
            >
              <Text style={styles.primaryButtonText}>{copy.continue}</Text>
            </LinearGradient>
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
    color: "rgba(242,231,215,0.85)"
  },
  noticeBox: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.4)",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 16,
    gap: 8
  },
  noticeTitle: {
    color: PALETTE.sand,
    fontWeight: "700",
    fontSize: 15
  },
  noticeBody: {
    color: "rgba(242,231,215,0.82)",
    fontSize: 14,
    lineHeight: 20
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
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
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  }
});

export default OnboardingNotificationsScreen;
