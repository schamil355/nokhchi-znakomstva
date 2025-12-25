import React, { useEffect, useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
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

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

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
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <Image source={heroImage} style={styles.heroImage} resizeMode="contain" />
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.primaryButton} onPress={handleContinue} accessibilityRole="button">
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryInner}
            >
              <Text style={styles.primaryButtonText}>{copy.cta}</Text>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8
  },
  heroImage: {
    width: 240,
    height: 240,
    marginTop: 4
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.sand,
    marginTop: 28,
    textAlign: "center",
    paddingHorizontal: 12
  },
  subtitle: {
    color: "rgba(242,231,215,0.82)",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 24
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: "transparent"
  },
  primaryButton: {
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden"
  },
  primaryInner: {
    width: "100%",
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  }
});

export default OnboardingVerifySuccessScreen;
