import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useOnboardingStore } from "../state/onboardingStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

const ACCENT_COLOR = "#0d6e4f";
const NAME_MAX_LENGTH = 50;
const LABEL_ID = "onboarding-name-label";
const DESCRIPTION_ID = "onboarding-name-description";

type Props = NativeStackScreenProps<any>;

const removeControlCharacters = (value: string) => value.replace(/[\u0000-\u001F\u007F]/g, "");

const translations = {
  en: {
    title: "What is your name?",
    subtitle: "Your name will be shown on your profile.",
    label: "Name",
    inputHint: "Enter your name as it should appear to others",
    continue: "Continue",
    accessibilityBack: "Back",
    accessibilityContinue: "Continue to the next step",
    accessibilityPlaceholder: "Enter your name"
  },
  fr: {
    title: "Comment t'appelles-tu ?",
    subtitle: "Ton nom s'affichera sur ton profil.",
    label: "Nom",
    inputHint: "Entre ton nom tel qu'il doit apparaître aux autres",
    continue: "Continuer",
    accessibilityBack: "Retour",
    accessibilityContinue: "Passer à l'étape suivante",
    accessibilityPlaceholder: "Saisir le nom"
  },
  de: {
    title: "Wie heißt du?",
    subtitle: "Dein Name wird auf deinem Profil angezeigt.",
    label: "Name",
    inputHint: "Gib deinen Namen ein, so wie er anderen angezeigt werden soll",
    continue: "Weiter",
    accessibilityBack: "Zurück",
    accessibilityContinue: "Weiter zum nächsten Schritt",
    accessibilityPlaceholder: "Name eingeben"
  },
  ru: {
    title: "Как тебя зовут?",
    subtitle: "Твоё имя будет видно в профиле.",
    label: "Имя",
    inputHint: "Введи имя так, как его должны видеть другие",
    continue: "Далее",
    accessibilityBack: "Назад",
    accessibilityContinue: "Перейти к следующему шагу",
    accessibilityPlaceholder: "Введите имя"
  }
};

const OnboardingNameScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const persistedName = useOnboardingStore((state) => state.name);
  const setName = useOnboardingStore((state) => state.setName);
  const [nameInput, setNameInput] = useState(persistedName);
  const [isFocused, setIsFocused] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!selectedGender) {
      navigation.replace("OnboardingGender");
    }
  }, [navigation, selectedGender]);

  useEffect(() => {
    setNameInput(persistedName);
  }, [persistedName]);

  const avatarSource = useMemo(() => {
    if (selectedGender === "female") {
      return require("../../assets/onboarding/step2/female_avatar_step_2.png");
    }
    return require("../../assets/onboarding/step2/male_avatar_step_2.png");
  }, [selectedGender]);

  const trimmedName = nameInput.trim();
  const continueDisabled = trimmedName.length === 0;

  const handleChangeName = useCallback((value: string) => {
    const sanitized = removeControlCharacters(value).slice(0, NAME_MAX_LENGTH);
    setNameInput(sanitized);
  }, []);

  const handleContinue = useCallback(() => {
    if (continueDisabled) {
      return;
    }
    setName(trimmedName);
    navigation.navigate("OnboardingBirthday");
  }, [continueDisabled, navigation, setName, trimmedName]);

  if (!selectedGender) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardAvoider}
        keyboardVerticalOffset={Platform.select({ ios: insets.top + 24, android: 0 })}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            <View style={styles.header}>
              <Pressable
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel={copy.accessibilityBack}
                style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              >
                <Ionicons name="chevron-back" size={24} color="#1f1f1f" />
              </Pressable>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
            </View>

            <View style={styles.hero}>
              <Image source={avatarSource} style={styles.heroImage} resizeMode="contain" />
            </View>

            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle} nativeID={DESCRIPTION_ID}>
              {copy.subtitle}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel} nativeID={LABEL_ID}>
                {copy.label}
              </Text>
              <TextInput
                value={nameInput}
                onChangeText={handleChangeName}
                placeholder=""
                maxLength={NAME_MAX_LENGTH}
                accessibilityLabel={copy.accessibilityPlaceholder}
                accessibilityLabelledBy={LABEL_ID}
                accessibilityHint={copy.inputHint}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={[styles.textInput, isFocused && styles.textInputFocused]}
                autoCapitalize="words"
                autoComplete="name"
                keyboardAppearance="light"
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable
            onPress={handleContinue}
            disabled={continueDisabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: continueDisabled }}
            accessibilityHint={continueDisabled ? copy.inputHint : copy.accessibilityContinue}
            style={({ pressed }) => [
              styles.primaryButton,
              continueDisabled && styles.primaryButtonDisabled,
              pressed && !continueDisabled && styles.primaryButtonPressed
            ]}
          >
            <Text style={styles.primaryButtonText}>{copy.continue}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  keyboardAvoider: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24
  },
  inner: {
    backgroundColor: "#ffffff",
    gap: 0
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  backButtonPressed: {
    opacity: 0.7
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#f1f1f1",
    borderRadius: 999
  },
  progressFill: {
    width: "40%",
    height: "100%",
    backgroundColor: ACCENT_COLOR,
    borderRadius: 999
  },
  hero: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24
  },
  heroImage: {
    width: 220,
    height: 220
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: "#121212",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: "#4a4a4a",
    marginBottom: 24
  },
  inputGroup: {
    width: "100%"
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 8
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#e6e6e6",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "500",
    backgroundColor: "#fff",
    color: "#111"
  },
  textInputFocused: {
    borderColor: ACCENT_COLOR,
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: "#ffffff"
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 18,
    borderRadius: 999
  },
  primaryButtonPressed: {
    opacity: 0.85
  },
  primaryButtonDisabled: {
    backgroundColor: "#c6dcd3"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  }
});

export default OnboardingNameScreen;
