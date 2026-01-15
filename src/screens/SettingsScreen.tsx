import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { signOut } from "../services/authService";
import { deleteAccount } from "../services/accountService";
import { getWebPushStatus, sendWebPushTest, subscribeWebPush, unsubscribeWebPush } from "../services/webPushService";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  base: "#0b1a12",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  card: "rgba(11,31,22,0.8)",
  danger: "#d95f56",
  welcomeBorder: "#d9c58d"
};

type CopyShape = {
  title: string;
  privacy: string;
  terms: string;
  account: string;
  signOut: string;
  signOutLoading: string;
  signOutErrorTitle: string;
  signOutError: string;
  delete: string;
  deleteLoading: string;
  deleteConfirmTitle: string;
  deleteConfirmMessage: string;
  deleteConfirmYes: string;
  deleteErrorTitle: string;
  deleteError: string;
  cancel: string;
  webPush: {
    title: string;
    description: string;
    enable: string;
    disable: string;
    test: string;
    unsupported: string;
    statusEnabled: string;
    statusDisabled: string;
    error: string;
  };
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    title: "Settings",
    privacy: "Privacy policy",
    terms: "Terms",
    account: "Account",
    signOut: "Sign out",
    signOutLoading: "Signing out…",
    signOutErrorTitle: "Sign-out failed",
    signOutError: "Please try again.",
    delete: "Delete account",
    deleteLoading: "Deleting…",
    deleteConfirmTitle: "Delete account?",
    deleteConfirmMessage: "This will remove your account and data.",
    deleteConfirmYes: "Delete",
    deleteErrorTitle: "Deletion failed",
    deleteError: "Please try again.",
    cancel: "Cancel",
    webPush: {
      title: "Web notifications",
      description: "Receive messages even when the app is closed.",
      enable: "Enable",
      disable: "Disable",
      test: "Send test push",
      unsupported: "Web push is not supported on this device.",
      statusEnabled: "Enabled",
      statusDisabled: "Disabled",
      error: "Web push could not be updated."
    }
  },
  de: {
    title: "Einstellungen",
    privacy: "Datenschutzerklärung",
    terms: "Bedingungen",
    account: "Account",
    signOut: "Abmelden",
    signOutLoading: "Melde ab…",
    signOutErrorTitle: "Abmelden fehlgeschlagen",
    signOutError: "Bitte versuche es erneut.",
    delete: "Account löschen",
    deleteLoading: "Lösche…",
    deleteConfirmTitle: "Account löschen?",
    deleteConfirmMessage: "Das löscht deinen Account und deine Daten.",
    deleteConfirmYes: "Löschen",
    deleteErrorTitle: "Löschen fehlgeschlagen",
    deleteError: "Bitte versuche es erneut.",
    cancel: "Abbrechen",
    webPush: {
      title: "Web-Benachrichtigungen",
      description: "Erhalte Nachrichten auch wenn die App geschlossen ist.",
      enable: "Aktivieren",
      disable: "Deaktivieren",
      test: "Test-Push senden",
      unsupported: "Web-Push wird nicht unterstützt.",
      statusEnabled: "Aktiv",
      statusDisabled: "Inaktiv",
      error: "Web-Push konnte nicht geändert werden."
    }
  },
  fr: {
    title: "Réglages",
    privacy: "Confidentialité",
    terms: "Conditions",
    account: "Compte",
    signOut: "Se déconnecter",
    signOutLoading: "Déconnexion…",
    signOutErrorTitle: "Échec de la déconnexion",
    signOutError: "Veuillez réessayer.",
    delete: "Supprimer le compte",
    deleteLoading: "Suppression…",
    deleteConfirmTitle: "Supprimer le compte ?",
    deleteConfirmMessage: "Cela supprimera ton compte et tes données.",
    deleteConfirmYes: "Supprimer",
    deleteErrorTitle: "Échec de la suppression",
    deleteError: "Veuillez réessayer.",
    cancel: "Annuler",
    webPush: {
      title: "Notifications web",
      description: "Recevez des messages même lorsque l'app est fermée.",
      enable: "Activer",
      disable: "Désactiver",
      test: "Envoyer un test",
      unsupported: "Le push web n'est pas pris en charge.",
      statusEnabled: "Activé",
      statusDisabled: "Désactivé",
      error: "Impossible de mettre à jour le push web."
    }
  },
  ru: {
    title: "Настройки",
    privacy: "Политика конфиденциальности",
    terms: "Условия",
    account: "Аккаунт",
    signOut: "Выйти",
    signOutLoading: "Выходим…",
    signOutErrorTitle: "Не удалось выйти",
    signOutError: "Попробуй еще раз.",
    delete: "Удалить аккаунт",
    deleteLoading: "Удаляем…",
    deleteConfirmTitle: "Удалить аккаунт?",
    deleteConfirmMessage: "Это удалит твой аккаунт и данные.",
    deleteConfirmYes: "Удалить",
    deleteErrorTitle: "Не удалось удалить",
    deleteError: "Попробуй еще раз.",
    cancel: "Отмена",
    webPush: {
      title: "Веб-уведомления",
      description: "Получайте сообщения даже когда приложение закрыто.",
      enable: "Включить",
      disable: "Выключить",
      test: "Тестовый пуш",
      unsupported: "Web Push не поддерживается на этом устройстве.",
      statusEnabled: "Включено",
      statusDisabled: "Выключено",
      error: "Не удалось обновить web push."
    }
  }
};

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const copy = useLocalizedCopy(translations);
  const errorCopy = useErrorCopy();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [webPushSupported, setWebPushSupported] = useState(false);
  const [webPushSubscribed, setWebPushSubscribed] = useState(false);
  const [webPushLoading, setWebPushLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    getWebPushStatus()
      .then((status) => {
        setWebPushSupported(status.supported);
        setWebPushSubscribed(status.subscribed);
      })
      .catch(() => {
        setWebPushSupported(false);
        setWebPushSubscribed(false);
      });
  }, []);

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Profile" as never);
    }
  }, [navigation]);

  const openLegal = useCallback(
    (screen: "privacy" | "terms") => {
      navigation.navigate("Legal" as never, { screen });
    },
    [navigation]
  );

  const handleSignOut = useCallback(async () => {
    if (isSigningOut || isDeleting) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error: any) {
      logError(error, "sign-out");
      Alert.alert(copy.signOutErrorTitle, getErrorMessage(error, errorCopy, copy.signOutError));
    } finally {
      setIsSigningOut(false);
    }
  }, [copy.signOutError, copy.signOutErrorTitle, errorCopy, isDeleting, isSigningOut]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      await signOut();
    } catch (error: any) {
      logError(error, "delete-account");
      Alert.alert(copy.deleteErrorTitle, getErrorMessage(error, errorCopy, copy.deleteError));
    } finally {
      setIsDeleting(false);
      setIsSigningOut(false);
    }
  }, [copy.deleteError, copy.deleteErrorTitle, errorCopy]);

  const confirmDelete = useCallback(() => {
    if (isSigningOut || isDeleting) return;
    Alert.alert(copy.deleteConfirmTitle, copy.deleteConfirmMessage, [
      { text: copy.cancel, style: "cancel" },
      { text: copy.deleteConfirmYes, style: "destructive", onPress: handleDelete }
    ]);
  }, [
    copy.cancel,
    copy.deleteConfirmMessage,
    copy.deleteConfirmTitle,
    copy.deleteConfirmYes,
    handleDelete,
    isDeleting,
    isSigningOut
  ]);

  const linkRows = [
    { label: copy.privacy, onPress: () => openLegal("privacy") },
    { label: copy.terms, onPress: () => openLegal("terms") }
  ];

  const refreshWebPushStatus = useCallback(async () => {
    if (Platform.OS !== "web") {
      return;
    }
    const status = await getWebPushStatus();
    setWebPushSupported(status.supported);
    setWebPushSubscribed(status.subscribed);
  }, []);

  const handleWebPushToggle = useCallback(async () => {
    if (webPushLoading) return;
    setWebPushLoading(true);
    try {
      if (webPushSubscribed) {
        await unsubscribeWebPush();
      } else {
        await subscribeWebPush();
      }
      await refreshWebPushStatus();
    } catch (error) {
      Alert.alert(copy.webPush.error);
    } finally {
      setWebPushLoading(false);
    }
  }, [copy.webPush.error, refreshWebPushStatus, webPushLoading, webPushSubscribed]);

  const handleWebPushTest = useCallback(async () => {
    if (webPushLoading) return;
    setWebPushLoading(true);
    try {
      await sendWebPushTest();
    } catch (error) {
      Alert.alert(copy.webPush.error);
    } finally {
      setWebPushLoading(false);
    }
  }, [copy.webPush.error, webPushLoading]);

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, PALETTE.base]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
          >
            <Ionicons name="close" size={22} color={PALETTE.sand} />
          </Pressable>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + 48, 64) }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {linkRows.map((row, index) => (
              <Pressable
                key={row.label}
                style={[styles.row, index < linkRows.length - 1 && styles.rowDivider]}
                onPress={row.onPress}
              >
                <Text style={styles.rowText}>{row.label}</Text>
                <Ionicons name="open-outline" size={18} color={PALETTE.sand} />
              </Pressable>
            ))}
          </View>

          {Platform.OS === "web" ? (
            <View style={[styles.card, styles.webPushCard]}>
              <View style={styles.webPushHeader}>
                <Text style={styles.cardTitle}>{copy.webPush.title}</Text>
                <Text style={styles.webPushStatus}>
                  {webPushSupported
                    ? webPushSubscribed
                      ? copy.webPush.statusEnabled
                      : copy.webPush.statusDisabled
                    : copy.webPush.unsupported}
                </Text>
              </View>
              <Text style={styles.webPushDescription}>{copy.webPush.description}</Text>
              {webPushSupported ? (
                <View style={styles.webPushActions}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.webPushButton,
                      pressed && styles.buttonPressed,
                      webPushLoading && styles.disabled
                    ]}
                    onPress={handleWebPushToggle}
                    disabled={webPushLoading}
                  >
                    <Text style={styles.webPushButtonText}>
                      {webPushSubscribed ? copy.webPush.disable : copy.webPush.enable}
                    </Text>
                  </Pressable>
                  {webPushSubscribed ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.webPushSecondary,
                        pressed && styles.buttonPressed,
                        webPushLoading && styles.disabled
                      ]}
                      onPress={handleWebPushTest}
                      disabled={webPushLoading}
                    >
                      {webPushLoading ? (
                        <ActivityIndicator color={PALETTE.sand} />
                      ) : (
                        <Text style={styles.webPushSecondaryText}>{copy.webPush.test}</Text>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.card, styles.accountCard]}>
            <Text style={styles.cardTitle}>{copy.account}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                (isSigningOut || isDeleting) && styles.disabled
              ]}
              onPress={handleSignOut}
              disabled={isSigningOut || isDeleting}
            >
              <LinearGradient
                colors={["#0f0f0f", "#0a0a0a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                <Text style={styles.primaryText}>
                  {isSigningOut ? copy.signOutLoading : copy.signOut}
                </Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.dangerButton,
                pressed && styles.buttonPressed,
                (isSigningOut || isDeleting) && styles.disabled
              ]}
              onPress={confirmDelete}
              disabled={isSigningOut || isDeleting}
            >
              <Text style={styles.dangerText}>
                {isDeleting ? copy.deleteLoading : copy.delete}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safe: {
    flex: 1,
    backgroundColor: "transparent"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: PALETTE.sand
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    gap: 16
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)",
    overflow: "hidden"
  },
  webPushCard: {
    padding: 16,
    gap: 12
  },
  webPushHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  webPushStatus: {
    color: "rgba(242, 231, 215, 0.7)",
    fontSize: 12,
    fontWeight: "600"
  },
  webPushDescription: {
    color: "rgba(242, 231, 215, 0.7)",
    fontSize: 13
  },
  webPushActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap"
  },
  webPushButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PALETTE.gold
  },
  webPushButtonText: {
    color: PALETTE.deep,
    fontWeight: "700",
    fontSize: 13
  },
  webPushSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.35)"
  },
  webPushSecondaryText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 13
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderColor: "rgba(217,192,143,0.2)"
  },
  rowText: {
    fontSize: 16,
    fontWeight: "600",
    color: PALETTE.sand
  },
  accountCard: {
    padding: 16,
    gap: 14
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: PALETTE.sand
  },
  primaryButton: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.35)",
    overflow: "hidden"
  },
  primaryInner: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: {
    color: PALETTE.sand,
    fontSize: 16,
    fontWeight: "700"
  },
  dangerButton: {
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.35)",
    backgroundColor: PALETTE.danger,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  dangerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.6
  }
});

export default SettingsScreen;
