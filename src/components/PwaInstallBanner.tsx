import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { BeforeInstallPromptEvent, isAndroidDevice, isIOSDevice, isStandaloneMode } from "../lib/pwa";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const translations = {
  en: {
    title: "Install the app",
    body: "Save it as an icon and open it like an app.",
    iosBody: "⋯ → Share → Add to Home Screen.",
    androidBody: "⋮ → Add to Home screen.",
    install: "Install",
    dismiss: "Not now"
  },
  de: {
    title: "App installieren",
    body: "Als Icon speichern und direkt starten.",
    iosBody: "⋯ → Teilen → Zum Home-Bildschirm.",
    androidBody: "⋮ → Zum Startbildschirm hinzufügen.",
    install: "Installieren",
    dismiss: "Später"
  },
  fr: {
    title: "Installer l'app",
    body: "Enregistre l'icône et ouvre-la comme une app.",
    iosBody: "⋯ → Partager → Sur l'écran d'accueil.",
    androidBody: "⋮ → Ajouter à l'écran d'accueil.",
    install: "Installer",
    dismiss: "Plus tard"
  },
  ru: {
    title: "Установить приложение",
    body: "Сохраните как значок и открывайте как приложение.",
    iosBody: "⋯ → Поделиться → На экран «Домой».",
    androidBody: "⋮ → Добавить на главный экран.",
    install: "Установить",
    dismiss: "Позже"
  }
};

const PwaInstallBanner = () => {
  const copy = useLocalizedCopy(translations);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const isIOS = useMemo(() => (Platform.OS === "web" ? isIOSDevice() : false), []);
  const isAndroid = useMemo(() => (Platform.OS === "web" ? isAndroidDevice() : false), []);
  const bodyText = isIOS ? copy.iosBody : isAndroid ? copy.androidBody : copy.body;
  const guideSteps = useMemo<Array<keyof typeof Ionicons.glyphMap>>(() => {
    if (isIOS) {
      return ["ellipsis-horizontal", "share-outline", "home-outline"];
    }
    if (isAndroid) {
      return ["ellipsis-vertical", "home-outline"];
    }
    return [];
  }, [isAndroid, isIOS]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    setStandalone(isStandaloneMode());
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setPromptEvent(null);
      setStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (Platform.OS !== "web" || dismissed || standalone) {
    return null;
  }

  if (!promptEvent && !isIOS && !isAndroid) {
    return null;
  }

  const handleInstall = async () => {
    if (!promptEvent) {
      return;
    }
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setStandalone(true);
      }
    } catch (error) {
      console.warn("[PWA] install prompt failed", error);
    } finally {
      setPromptEvent(null);
    }
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.banner}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{bodyText}</Text>
          {guideSteps.length > 0 && (
            <View style={styles.guideRow} accessibilityRole="text" accessibilityLabel={bodyText}>
              {guideSteps.map((iconName, index) => (
                <React.Fragment key={`${iconName}-${index}`}>
                  <View style={styles.guideChip}>
                    <Ionicons name={iconName} size={16} color={PALETTE.sand} />
                  </View>
                  {index < guideSteps.length - 1 && (
                    <Ionicons name="chevron-forward" size={14} color="rgba(242, 231, 215, 0.6)" style={styles.guideArrow} />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
        <View style={styles.actions}>
          {promptEvent ? (
            <Pressable onPress={handleInstall} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}>
              <Ionicons name="download-outline" size={16} color={PALETTE.deep} />
              <Text style={styles.primaryText}>{copy.install}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setDismissed(true)} style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}>
            <Text style={styles.secondaryText}>{copy.dismiss}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 12,
    alignItems: "center"
  },
  banner: {
    width: "92%",
    maxWidth: 520,
    borderRadius: 16,
    backgroundColor: "rgba(11, 31, 22, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.35)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }
  },
  textBlock: {
    gap: 6
  },
  title: {
    color: PALETTE.sand,
    fontSize: 16,
    fontWeight: "700"
  },
  body: {
    color: "rgba(242, 231, 215, 0.78)",
    fontSize: 13
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10
  },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.gold
  },
  primaryPressed: {
    opacity: 0.8
  },
  primaryText: {
    color: PALETTE.deep,
    fontWeight: "700",
    fontSize: 13
  },
  secondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.4)"
  },
  secondaryPressed: {
    opacity: 0.7
  },
  secondaryText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 13
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4
  },
  guideChip: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  guideArrow: {
    opacity: 0.7
  }
});

export default PwaInstallBanner;
