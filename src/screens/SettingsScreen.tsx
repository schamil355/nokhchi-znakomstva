import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { signOut } from "../services/authService";
import { deleteAccount } from "../services/accountService";

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
    cancel: "Cancel"
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
    cancel: "Abbrechen"
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
    cancel: "Annuler"
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
    cancel: "Отмена"
  }
};

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const copy = useLocalizedCopy(translations);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      navigation.navigate("Welcome" as never);
    } catch (error: any) {
      Alert.alert(copy.signOutErrorTitle, error?.message ?? copy.signOutError);
    } finally {
      setIsSigningOut(false);
    }
  }, [copy.signOutError, copy.signOutErrorTitle, isDeleting, isSigningOut, navigation]);

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

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      navigation.navigate("Welcome" as never);
    } catch (error: any) {
      Alert.alert(copy.deleteErrorTitle, error?.message ?? copy.deleteError);
    } finally {
      setIsDeleting(false);
      setIsSigningOut(false);
    }
  }, [copy.deleteError, copy.deleteErrorTitle, navigation]);

  const linkRows = [
    { label: copy.privacy, onPress: () => openLegal("privacy") },
    { label: copy.terms, onPress: () => openLegal("terms") }
  ];

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, PALETTE.base]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={[styles.safe, { paddingTop: Math.max(insets.top, 16) }]} edges={["top", "left", "right"]}>
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
