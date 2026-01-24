import React, { useCallback, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { signOut } from "../services/authService";
import { deleteAccount } from "../services/accountService";
import { useAuthStore } from "../state/authStore";

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
  account: string;
  adminTitle: string;
  adminLeads: string;
  adminLeadsHint: string;
  signOut: string;
  signOutLoading: string;
  signOutErrorTitle: string;
  signOutError: string;
  deleteAccount: string;
  deleteAccountLoading: string;
  deleteAccountConfirmTitle: string;
  deleteAccountConfirmMessage: string;
  deleteAccountErrorTitle: string;
  deleteAccountError: string;
  cancel: string;
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    title: "Settings",
    account: "Account",
    adminTitle: "Admin",
    adminLeads: "Partner leads",
    adminLeadsHint: "View incoming requests",
    signOut: "Sign out",
    signOutLoading: "Signing out…",
    signOutErrorTitle: "Sign-out failed",
    signOutError: "Please try again.",
    deleteAccount: "Delete account",
    deleteAccountLoading: "Deleting account…",
    deleteAccountConfirmTitle: "Delete account?",
    deleteAccountConfirmMessage: "This permanently deletes your account and profile. This cannot be undone.",
    deleteAccountErrorTitle: "Account deletion failed",
    deleteAccountError: "Please try again.",
    cancel: "Cancel"
  },
  de: {
    title: "Einstellungen",
    account: "Account",
    adminTitle: "Admin",
    adminLeads: "Partner-Anfragen",
    adminLeadsHint: "Neue Anfragen anzeigen",
    signOut: "Abmelden",
    signOutLoading: "Melde ab…",
    signOutErrorTitle: "Abmelden fehlgeschlagen",
    signOutError: "Bitte versuche es erneut.",
    deleteAccount: "Account löschen",
    deleteAccountLoading: "Account wird gelöscht…",
    deleteAccountConfirmTitle: "Account löschen?",
    deleteAccountConfirmMessage: "Dein Account und Profil werden dauerhaft gelöscht. Das kann nicht rückgängig gemacht werden.",
    deleteAccountErrorTitle: "Löschen fehlgeschlagen",
    deleteAccountError: "Bitte versuche es erneut.",
    cancel: "Abbrechen"
  },
  fr: {
    title: "Réglages",
    account: "Compte",
    adminTitle: "Admin",
    adminLeads: "Leads partenaires",
    adminLeadsHint: "Voir les demandes",
    signOut: "Se déconnecter",
    signOutLoading: "Déconnexion…",
    signOutErrorTitle: "Échec de la déconnexion",
    signOutError: "Veuillez réessayer.",
    deleteAccount: "Supprimer le compte",
    deleteAccountLoading: "Suppression du compte…",
    deleteAccountConfirmTitle: "Supprimer le compte ?",
    deleteAccountConfirmMessage: "Votre compte et votre profil seront supprimés définitivement. Cette action est irréversible.",
    deleteAccountErrorTitle: "Échec de la suppression",
    deleteAccountError: "Veuillez réessayer.",
    cancel: "Annuler"
  },
  ru: {
    title: "Настройки",
    account: "Аккаунт",
    adminTitle: "Админ",
    adminLeads: "Заявки партнеров",
    adminLeadsHint: "Просмотр входящих заявок",
    signOut: "Выйти",
    signOutLoading: "Выходим…",
    signOutErrorTitle: "Не удалось выйти",
    signOutError: "Попробуй еще раз.",
    deleteAccount: "Удалить аккаунт",
    deleteAccountLoading: "Удаление аккаунта…",
    deleteAccountConfirmTitle: "Удалить аккаунт?",
    deleteAccountConfirmMessage: "Аккаунт и профиль будут удалены навсегда. Это действие нельзя отменить.",
    deleteAccountErrorTitle: "Не удалось удалить",
    deleteAccountError: "Попробуй еще раз.",
    cancel: "Отмена"
  }
};

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const copy = useLocalizedCopy(translations);
  const session = useAuthStore((state) => state.session);
  const errorCopy = useErrorCopy();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const isAdmin =
    session?.user?.app_metadata?.role === "admin" ||
    session?.user?.user_metadata?.role === "admin";

  const handleClose = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Profile" as never);
    }
  }, [navigation]);


  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error: any) {
      logError(error, "sign-out");
      Alert.alert(copy.signOutErrorTitle, getErrorMessage(error, errorCopy, copy.signOutError));
    } finally {
      setIsSigningOut(false);
    }
  }, [copy.signOutError, copy.signOutErrorTitle, errorCopy, isSigningOut]);

  const resetToWelcome = useCallback(() => {
    const parentNav: any = (navigation as any).getParent?.() ?? navigation;
    const rootNav: any = parentNav?.getParent?.() ?? parentNav;
    if (rootNav?.reset) {
      rootNav.reset({ index: 0, routes: [{ name: "Auth", params: { screen: "Welcome" } }] });
    }
  }, [navigation]);

  const performDeleteAccount = useCallback(async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      await signOut();
      resetToWelcome();
    } catch (error: any) {
      logError(error, "delete-account");
      Alert.alert(copy.deleteAccountErrorTitle, getErrorMessage(error, errorCopy, copy.deleteAccountError));
    } finally {
      setIsDeletingAccount(false);
    }
  }, [copy.deleteAccountError, copy.deleteAccountErrorTitle, errorCopy, isDeletingAccount, resetToWelcome]);

  const confirmDeleteAccount = useCallback(() => {
    if (Platform.OS === "web") {
      setIsDeleteConfirmVisible(true);
      return;
    }
    Alert.alert(copy.deleteAccountConfirmTitle, copy.deleteAccountConfirmMessage, [
      { text: copy.cancel, style: "cancel" },
      { text: copy.deleteAccount, style: "destructive", onPress: () => performDeleteAccount() }
    ]);
  }, [copy.cancel, copy.deleteAccount, copy.deleteAccountConfirmMessage, copy.deleteAccountConfirmTitle, performDeleteAccount]);

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
          {isAdmin && (
            <View style={[styles.card, styles.adminCard]}>
              <Text style={styles.cardTitle}>{copy.adminTitle}</Text>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                onPress={() => navigation.navigate("AdminPartnerLeads")}
              >
                <LinearGradient
                  colors={["#0f0f0f", "#0a0a0a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryInner}
                >
                  <Text style={styles.primaryText}>{copy.adminLeads}</Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.adminHint}>{copy.adminLeadsHint}</Text>
            </View>
          )}
          <View style={[styles.card, styles.accountCard]}>
            <Text style={styles.cardTitle}>{copy.account}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                isSigningOut && styles.disabled
              ]}
              onPress={handleSignOut}
              disabled={isSigningOut}
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
                (isDeletingAccount || isSigningOut) && styles.disabled
              ]}
              onPress={confirmDeleteAccount}
              disabled={isDeletingAccount || isSigningOut}
            >
              <Text style={styles.dangerText}>
                {isDeletingAccount ? copy.deleteAccountLoading : copy.deleteAccount}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
        {Platform.OS === "web" ? (
          <Modal
            visible={isDeleteConfirmVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIsDeleteConfirmVisible(false)}
          >
            <View style={styles.confirmBackdrop}>
              <Pressable
                style={styles.confirmBackdropTouchable}
                onPress={() => setIsDeleteConfirmVisible(false)}
              />
              <View style={styles.confirmCard}>
                <Text style={styles.confirmTitle}>{copy.deleteAccountConfirmTitle}</Text>
                <Text style={styles.confirmMessage}>{copy.deleteAccountConfirmMessage}</Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    style={[styles.confirmButton, styles.confirmButtonPrimary]}
                    onPress={() => {
                      setIsDeleteConfirmVisible(false);
                      void performDeleteAccount();
                    }}
                    disabled={isDeletingAccount}
                  >
                    <Text style={[styles.confirmButtonText, styles.confirmButtonTextPrimary]}>
                      {isDeletingAccount ? copy.deleteAccountLoading : copy.deleteAccount}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmButton, styles.confirmButtonSecondary]}
                    onPress={() => setIsDeleteConfirmVisible(false)}
                  >
                    <Text style={[styles.confirmButtonText, styles.confirmButtonTextSecondary]}>
                      {copy.cancel}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : null}
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
  adminCard: {
    padding: 16,
    gap: 12
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
  adminHint: {
    color: "rgba(242,231,215,0.7)",
    fontSize: 12
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
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  confirmBackdropTouchable: {
    ...StyleSheet.absoluteFillObject
  },
  confirmCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1d2932",
    textAlign: "center"
  },
  confirmMessage: {
    fontSize: 14,
    color: "rgba(29,41,50,0.75)",
    textAlign: "center",
    lineHeight: 20
  },
  confirmButtons: {
    width: "100%",
    gap: 12,
    marginTop: 8
  },
  confirmButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  confirmButtonPrimary: {
    backgroundColor: PALETTE.danger
  },
  confirmButtonSecondary: {
    backgroundColor: "#f4f5f7"
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "600"
  },
  confirmButtonTextPrimary: {
    color: "#ffffff"
  },
  confirmButtonTextSecondary: {
    color: "#2b3440"
  }
});

export default SettingsScreen;
