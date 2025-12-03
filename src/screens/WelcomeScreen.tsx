import React from "react";
import { Image, StyleSheet, Text, View, Pressable, Platform, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

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
    privacy: "Политикой конфиденциальности"
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
    privacy: "Datenschutz"
  },
  en: {
    title: "Noxchiin",
    subtitle: "“Dating for the Chechen community”",
    createAccount: "Create account",
    signIn: "Sign in",
    consentPrefix: "By continuing, you agree to our",
    consentAnd: "and",
    consentSuffix: ".",
    terms: "Terms",
    privacy: "Privacy"
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
    privacy: "Confidentialité"
  }
};

const PHONE_SIGNUP_ENABLED = false;

const WelcomeScreen = () => {
  const navigation = useNavigation<AuthStackNavigation>();
  const copy = useLocalizedCopy(translations);
  const { height } = Dimensions.get("window");
  const heroMaxHeight = Math.min(height * 0.6, 440);
  const handleOpenPrivacy = () => {
    navigation.navigate("Legal", { screen: "privacy" });
  };
  const handleOpenTerms = () => {
    navigation.navigate("Legal", { screen: "terms" });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
            <Text style={styles.primaryButtonText}>{copy.createAccount}</Text>
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
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff"
  },
  container: {
    flex: 1,
    paddingTop: 4,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "flex-start"
  },
  heroWrapper: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 12
  },
  hero: {
    width: "100%",
    height: "100%"
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
    color: "#2f2f2f"
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    color: "#4a4a4a",
    marginBottom: 18,
    paddingHorizontal: 16
  },
  actions: {
    width: "100%",
    gap: 14,
    marginBottom: 8
  },
  primaryButton: {
    backgroundColor: "#0d6e4f",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#0d6e4f",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: Platform.select({ ios: 0.98, default: 0.99 }) }]
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  secondaryButton: {
    backgroundColor: "#1f1f1f",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center"
  },
  secondaryButtonPressed: {
    opacity: 0.85
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500"
  },
  consentText: {
    marginTop: 16,
    textAlign: "center",
    color: "#4a4a4a",
    lineHeight: 18,
    paddingHorizontal: 12
  },
  consentLink: {
    fontWeight: "700"
  }
});

export default WelcomeScreen;
