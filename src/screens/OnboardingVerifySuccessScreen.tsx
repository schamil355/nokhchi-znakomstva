import React, { useEffect, useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { refetchProfile } from "../services/profileService";
import { useOnboardingStore } from "../state/onboardingStore";
import { useAuthStore } from "../state/authStore";

type Props = NativeStackScreenProps<any>;

const translations = {
  en: {
    title: "Successfully verified!",
    subtitle: "Awesome! Your profile now shows the verified badge.",
    cta: "Continue"
  },
  de: {
    title: "Erfolgreich verifiziert!",
    subtitle: "Super! Dein Profil trägt jetzt das Verifizierungsabzeichen.",
    cta: "Weiter"
  },
  fr: {
    title: "Vérification réussie !",
    subtitle: "Génial ! Ton profil affiche désormais le badge vérifié.",
    cta: "Continuer"
  },
  ru: {
    title: "Успешно подтверждено!",
    subtitle: "Отлично! В твоем профиле теперь есть значок подтверждения.",
    cta: "Продолжить"
  }
};

const maleHero = require("../../assets/verified-male.png");
const femaleHero = require("../../assets/verified-female.png");

const OnboardingVerifySuccessScreen = ({ navigation, route }: Props) => {
  const copy = useLocalizedCopy(translations);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const setShowVerifySuccess = useOnboardingStore((state) => state.setShowVerifySuccess);
  const markVerified = useAuthStore((state) => state.markVerified);
  const isProfileVerified = useAuthStore((state) => Boolean(state.profile?.verified) || state.verifiedOverride);
  const heroImage = useMemo(() => {
    if (selectedGender === "female") {
      return femaleHero;
    }
    return maleHero;
  }, [selectedGender]);

  useEffect(() => {
    if (!isProfileVerified) {
      markVerified();
    }
  }, [isProfileVerified, markVerified]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        await refetchProfile();
      } catch (error) {
        console.warn("[VerifySuccess] refetchProfile failed", error);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, []);

  const handleContinue = () => {
    // Mark the success screen as completed; AppNavigator will automatically
    // switch from the Auth stack to Main once verification flags change.
    setShowVerifySuccess(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Image source={heroImage} style={styles.heroImage} resizeMode="contain" />
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <Pressable style={styles.cta} onPress={handleContinue} accessibilityRole="button">
          <Text style={styles.ctaText}>{copy.cta}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32
  },
  heroImage: {
    width: 220,
    height: 220
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#050709",
    marginTop: 32,
    textAlign: "center"
  },
  subtitle: {
    color: "#4d515a",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center"
  },
  cta: {
    marginTop: 28,
    backgroundColor: "#0d6e4f",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});

export default OnboardingVerifySuccessScreen;
