import React from "react";
import { Image, StyleSheet, Text, View, Pressable, Platform, Dimensions } from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { LinearGradient } from "expo-linear-gradient";
import { useFeatureFlag } from "../lib/featureFlags";

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
    partnerHint: "Для бизнеса"
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
    partnerHint: "Fuer Haendler"
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
    partnerHint: "For businesses"
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
    partnerHint: "Espace commercants"
  }
};

const PHONE_SIGNUP_ENABLED = false;

const WelcomeScreen = () => {
  const navigation = useNavigation<AuthStackNavigation>();
  const copy = useLocalizedCopy(translations);
  const { height } = Dimensions.get("window");
  const heroMaxHeight = Math.min(height * 0.55, 420);
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
  }
});

export default WelcomeScreen;
