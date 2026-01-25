import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View, Pressable, Platform, Dimensions, TextInput } from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { LinearGradient } from "expo-linear-gradient";
import { useFeatureFlag } from "../lib/featureFlags";
import { useAuthStore } from "../state/authStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getEmailRedirectUrl } from "../services/authService";

type AuthStackNavigation = NativeStackNavigationProp<any>;

const translations = {
  ru: {
    title: "Нохчийн",
    subtitle: "«Знакомства для чеченского сообщества»",
    createAccount: "Создать аккаунт",
    signIn: "Войти",
    consentPrefix: "Продолжая, ты соглашаешься с",
    consentAnd: "и",
    consentSuffix: ".",
    terms: "Условиями",
    privacy: "Политикой конфиденциальности",
    partnerCta: "Стать партнером",
    partnerHint: "Для бизнеса",
    confirmTitle: "Подтверждение почты",
    confirmFailed: "Ссылка подтверждения недействительна или устарела. Запроси новый линк.",
    confirmOpenInBrowser: "Открой ссылку в Safari или Chrome (не внутри приложения).",
    confirmDismiss: "Понятно",
    confirmResendLabel: "E-mail",
    confirmResendPlaceholder: "Введите e-mail",
    confirmResendCta: "Отправить ссылку ещё раз",
    confirmResendSending: "Отправляем…",
    confirmResendSent: "Новый линк отправлен.",
    confirmResendMissing: "Введите e-mail, чтобы отправить линк.",
    confirmResendError: "Не удалось отправить линк. Попробуйте позже."
  },
  de: {
    title: "Нохчийн",
    subtitle: "„Partnersuche für die tschetschenische Gemeinschaft“",
    createAccount: "Account erstellen",
    signIn: "Anmelden",
    consentPrefix: "Mit dem Fortfahren stimmst du den",
    consentAnd: "und der",
    consentSuffix: "zu.",
    terms: "Bedingungen",
    privacy: "Datenschutz",
    partnerCta: "Partner werden",
    partnerHint: "Fuer Haendler",
    confirmTitle: "E-Mail bestätigen",
    confirmFailed: "Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.",
    confirmOpenInBrowser: "Bitte in Safari oder Chrome öffnen (kein In-App-Browser).",
    confirmDismiss: "Verstanden",
    confirmResendLabel: "E-Mail",
    confirmResendPlaceholder: "E-Mail eingeben",
    confirmResendCta: "Bestätigungslink erneut senden",
    confirmResendSending: "Sende…",
    confirmResendSent: "Neuer Link wurde gesendet.",
    confirmResendMissing: "Bitte E-Mail eingeben, um den Link zu senden.",
    confirmResendError: "Link konnte nicht gesendet werden. Bitte später erneut versuchen."
  },
  en: {
    title: "Noxchiin",
    subtitle: "“Partner search for the Chechen community”",
    createAccount: "Create account",
    signIn: "Sign in",
    consentPrefix: "By continuing, you agree to our",
    consentAnd: "and",
    consentSuffix: ".",
    terms: "Terms",
    privacy: "Privacy",
    partnerCta: "Become a partner",
    partnerHint: "For businesses",
    confirmTitle: "Email confirmation",
    confirmFailed: "The confirmation link is invalid or expired. Please request a new link.",
    confirmOpenInBrowser: "Please open the link in Safari or Chrome (not inside an app).",
    confirmDismiss: "Got it",
    confirmResendLabel: "Email",
    confirmResendPlaceholder: "Enter your email",
    confirmResendCta: "Resend confirmation link",
    confirmResendSending: "Sending…",
    confirmResendSent: "A new link was sent.",
    confirmResendMissing: "Please enter your email to resend the link.",
    confirmResendError: "Could not send the link. Please try again later."
  },
  fr: {
    title: "Noxchiin",
    subtitle: "« Rencontres pour la communauté tchétchène »",
    createAccount: "Créer un compte",
    signIn: "Se connecter",
    consentPrefix: "En continuant, vous acceptez nos",
    consentAnd: "et la",
    consentSuffix: ".",
    terms: "Conditions",
    privacy: "Confidentialité",
    partnerCta: "Devenir partenaire",
    partnerHint: "Espace commercants",
    confirmTitle: "Confirmation d’e-mail",
    confirmFailed: "Le lien de confirmation est invalide ou expiré. Demande un nouveau lien.",
    confirmOpenInBrowser: "Ouvre le lien dans Safari ou Chrome (pas dans une app).",
    confirmDismiss: "Compris",
    confirmResendLabel: "E-mail",
    confirmResendPlaceholder: "Saisis ton e-mail",
    confirmResendCta: "Renvoyer le lien",
    confirmResendSending: "Envoi…",
    confirmResendSent: "Nouveau lien envoyé.",
    confirmResendMissing: "Saisis ton e-mail pour renvoyer le lien.",
    confirmResendError: "Impossible d’envoyer le lien. Réessaie plus tard."
  }
};

const PHONE_SIGNUP_ENABLED = false;

const WelcomeScreen = () => {
  const navigation = useNavigation<AuthStackNavigation>();
  const copy = useLocalizedCopy(translations);
  const { height } = Dimensions.get("window");
  const heroMaxHeight = Math.min(height * 0.55, 420);
  const authNotice = useAuthStore((state) => state.authNotice);
  const clearAuthNotice = useAuthStore((state) => state.clearAuthNotice);
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const canShowResend = useMemo(() => authNotice?.type === "confirm_failed", [authNotice?.type]);

  const handleResend = async () => {
    if (resendLoading) return;
    const email = resendEmail.trim().toLowerCase();
    if (!email) {
      setResendStatus(copy.confirmResendMissing);
      return;
    }
    setResendLoading(true);
    setResendStatus(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: getEmailRedirectUrl() }
      });
      if (error) {
        throw error;
      }
      setResendStatus(copy.confirmResendSent);
    } catch {
      setResendStatus(copy.confirmResendError);
    } finally {
      setResendLoading(false);
    }
  };
  const { enabled: partnerEnabled } = useFeatureFlag("partner_leads", {
    platform: "web",
    defaultValue: false,
    refreshIntervalMs: 60_000
  });
  const handleOpenPrivacy = () => {
    navigation.navigate("Legal", { screen: "privacy" });
  };
  const handleOpenTerms = () => {
    navigation.navigate("Legal", { screen: "terms" });
  };

  return (
    <LinearGradient
      colors={["#0b1f16", "#0f3b2c", "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>
        <View style={styles.container}>
          {Platform.OS === "web" && partnerEnabled && (
            <Pressable
              style={styles.partnerCorner}
              onPress={() => navigation.navigate("PartnerLanding")}
            >
              <Text style={styles.partnerLinkText}>{copy.partnerCta}</Text>
              <Text style={styles.partnerHint}>{copy.partnerHint}</Text>
            </Pressable>
          )}
          {authNotice?.type === "confirm_failed" && (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{copy.confirmTitle}</Text>
              <Text style={styles.noticeBody}>{copy.confirmFailed}</Text>
              {authNotice.inAppBrowser && (
                <Text style={styles.noticeBody}>{copy.confirmOpenInBrowser}</Text>
              )}
              {canShowResend && (
                <View style={styles.noticeResend}>
                  <Text style={styles.noticeLabel}>{copy.confirmResendLabel}</Text>
                  <TextInput
                    style={styles.noticeInput}
                    placeholder={copy.confirmResendPlaceholder}
                    placeholderTextColor="rgba(242,231,215,0.55)"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={resendEmail}
                    onChangeText={(value) => {
                      setResendStatus(null);
                      setResendEmail(value);
                    }}
                  />
                  <Pressable
                    onPress={handleResend}
                    style={({ pressed }) => [
                      styles.noticeCta,
                      pressed && styles.noticeButtonPressed,
                      resendLoading && styles.noticeCtaDisabled
                    ]}
                  >
                    <Text style={styles.noticeCtaText}>
                      {resendLoading ? copy.confirmResendSending : copy.confirmResendCta}
                    </Text>
                  </Pressable>
                  {resendStatus ? <Text style={styles.noticeStatus}>{resendStatus}</Text> : null}
                </View>
              )}
              <Pressable
                onPress={clearAuthNotice}
                style={({ pressed }) => [styles.noticeButton, pressed && styles.noticeButtonPressed]}
              >
                <Text style={styles.noticeButtonText}>{copy.confirmDismiss}</Text>
              </Pressable>
            </View>
          )}
          <View style={[styles.heroWrapper, { maxHeight: heroMaxHeight }]}>
            <Image
              source={require("../../assets/welcome-hero.png")}
              style={[styles.hero, { maxHeight: heroMaxHeight }]}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.actions}>
            <Pressable
              testID="cta-create-account"
              onPress={() =>
                navigation.navigate(PHONE_SIGNUP_ENABLED ? "RegisterChoice" : "CreateAccount", {
                  mode: "email"
                })
              }
              onPressIn={clearAuthNotice}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed
              ]}
            >
              <LinearGradient
                colors={["#d9c08f", "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                <Text style={styles.primaryButtonText}>{copy.createAccount}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              testID="cta-sign-in"
              onPress={() => navigation.navigate("SignIn")}
              onPressIn={clearAuthNotice}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed
              ]}
            >
              <Text style={styles.secondaryButtonText}>{copy.signIn}</Text>
            </Pressable>
          </View>
          <Text style={styles.consentText}>
            {copy.consentPrefix}{" "}
            <Text style={styles.consentLink} onPress={handleOpenTerms}>
              {copy.terms}
            </Text>{" "}
            {copy.consentAnd}{" "}
            <Text style={styles.consentLink} onPress={handleOpenPrivacy}>
              {copy.privacy}
            </Text>
            {copy.consentSuffix ? ` ${copy.consentSuffix}` : ""}
          </Text>
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
  gradient: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "flex-start"
  },
  heroWrapper: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 18
  },
  hero: {
    width: "100%",
    height: "100%",
    aspectRatio: 0.65
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    color: "#f3e9d0"
  },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    color: "#d8c8a4",
    marginBottom: 32,
    paddingHorizontal: 18
  },
  actions: {
    width: "100%",
    gap: 14,
    marginBottom: 0
  },
  primaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 0,
    borderRadius: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d9c58d",
    overflow: "hidden",
    shadowColor: "rgba(13, 110, 79, 0.4)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: Platform.select({ ios: 0.98, default: 0.99 }) }]
  },
  primaryInner: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#f7f1dd",
    fontSize: 17,
    fontWeight: "600"
  },
  secondaryButton: {
    backgroundColor: "#0b1411",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4b503b",
    shadowColor: "rgba(0,0,0,0.6)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3
  },
  secondaryButtonPressed: {
    opacity: 0.85
  },
  secondaryButtonText: {
    color: "#f7f1dd",
    fontSize: 17,
    fontWeight: "500"
  },
  consentText: {
    marginTop: 24,
    textAlign: "center",
    color: "#bfbaab",
    lineHeight: 19,
    paddingHorizontal: 12
  },
  consentLink: {
    fontWeight: "700",
    color: "#d8c18f"
  },
  partnerCorner: {
    position: "absolute",
    top: 12,
    left: 28,
    alignItems: "flex-start",
    gap: 4,
    zIndex: 5
  },
  partnerLinkText: {
    color: "#d9c08f",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  partnerHint: {
    color: "rgba(242,231,215,0.7)",
    fontSize: 12
  },
  noticeCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 12
  },
  noticeTitle: {
    color: "#f2e7d7",
    fontWeight: "700",
    marginBottom: 4
  },
  noticeBody: {
    color: "rgba(242,231,215,0.85)",
    fontSize: 13,
    marginBottom: 6
  },
  noticeResend: {
    marginTop: 4,
    marginBottom: 8,
    gap: 8
  },
  noticeLabel: {
    color: "rgba(242,231,215,0.85)",
    fontSize: 12
  },
  noticeInput: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f2e7d7",
    backgroundColor: "rgba(11,20,17,0.45)"
  },
  noticeCta: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.8)",
    backgroundColor: "rgba(11,20,17,0.35)"
  },
  noticeCtaDisabled: {
    opacity: 0.7
  },
  noticeCtaText: {
    color: "#f2e7d7",
    fontWeight: "600",
    fontSize: 13
  },
  noticeStatus: {
    color: "rgba(242,231,215,0.8)",
    fontSize: 12
  },
  noticeButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.7)"
  },
  noticeButtonPressed: {
    opacity: 0.85
  },
  noticeButtonText: {
    color: "#f2e7d7",
    fontWeight: "600",
    fontSize: 13
  }
});

export default WelcomeScreen;
