import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

const translations = {
  en: {
    title: "Next step",
    subtitle: "Placeholder screen for upcoming onboarding steps."
  },
  de: {
    title: "Nächster Schritt",
    subtitle: "Dieser Bildschirm ist ein Platzhalter für die kommenden Onboarding-Schritte."
  },
  fr: {
    title: "Prochaine étape",
    subtitle: "Écran temporaire pour les prochaines étapes d'onboarding."
  },
  ru: {
    title: "Следующий шаг",
    subtitle: "Экран-заглушка для следующих шагов онбординга."
  }
};

const OnboardingNextScreen = () => {
  const copy = useLocalizedCopy(translations);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111"
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center"
  }
});

export default OnboardingNextScreen;
