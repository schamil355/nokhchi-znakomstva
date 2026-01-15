import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { BeforeInstallPromptEvent, isIOSDevice, isStandaloneMode } from "../lib/pwa";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const translations = {
  en: {
    title: "Install the app",
    body: "Add Нохчи Знакомства to your home screen for faster access.",
    iosBody: "On iOS: tap \"Install\" and then \"Add to Home Screen\".",
    install: "Install",
    dismiss: "Not now",
    share: "Install"
  },
  de: {
    title: "App installieren",
    body: "Füge Нохчи Знакомства zum Homescreen hinzu für schnellen Zugriff.",
    iosBody: "Auf iOS: Tippe auf \"Installieren\" und dann \"Zum Home-Bildschirm\".",
    install: "Installieren",
    dismiss: "Später",
    share: "Installieren"
  },
  fr: {
    title: "Installer l'app",
    body: "Ajoute Нохчи Знакомства à l'écran d'accueil pour un accès rapide.",
    iosBody: "Sur iOS : touche \"Installer\" puis \"Sur l'écran d'accueil\".",
    install: "Installer",
    dismiss: "Plus tard",
    share: "Installer"
  },
  ru: {
    title: "Установить приложение",
    body: "Добавьте Нохчи Знакомства на главный экран для быстрого доступа.",
    iosBody: "На iOS: нажмите «Установить», затем «На экран Домой».",
    install: "Установить",
    dismiss: "Позже",
    share: "Установить"
  }
};

const PwaInstallBanner = () => {
  const copy = useLocalizedCopy(translations);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const isIOS = useMemo(() => (Platform.OS === "web" ? isIOSDevice() : false), []);

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

  if (!promptEvent && !isIOS) {
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

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      return;
    }
    if (!("share" in navigator)) {
      return;
    }
    try {
      await navigator.share({
        title: copy.title,
        text: copy.body,
        url: window.location.href
      });
    } catch (error) {
      // User cancelled or share not available; ignore.
    }
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.banner}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{isIOS ? copy.iosBody : copy.body}</Text>
        </View>
        <View style={styles.actions}>
          {promptEvent ? (
            <Pressable onPress={handleInstall} style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}>
              <Ionicons name="download-outline" size={16} color={PALETTE.deep} />
              <Text style={styles.primaryText}>{copy.install}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.iosShare, pressed && styles.iosSharePressed]}
              accessibilityRole="button"
              accessibilityLabel={copy.iosBody}
            >
              <Ionicons name="share-outline" size={16} color={PALETTE.gold} />
              <Text style={styles.iosShareText}>{copy.share}</Text>
            </Pressable>
          )}
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
  iosShare: {
    height: 34,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.4)"
  },
  iosSharePressed: {
    opacity: 0.7
  },
  iosShareText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 13
  }
});

export default PwaInstallBanner;
