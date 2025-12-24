import React, { useRef, useState, useCallback, useEffect } from "react";
import { Image, NativeSyntheticEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useOnboardingStore } from "../state/onboardingStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { usePreferencesStore } from "../state/preferencesStore";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

type Props = NativeStackScreenProps<any>;

type GenderValue = "male" | "female";

type GenderOption = {
  value: GenderValue;
  image: ReturnType<typeof require>;
};

type KeyPressEvent = NativeSyntheticEvent<{
  key: string;
}>;

const genderOptions: GenderOption[] = [
  {
    value: "male",
    image: require("../../assets/male_avatar.png")
  },
  {
    value: "female",
    image: require("../../assets/female_avatar.png")
  }
];

type FocusableCard = View & { focus?: () => void };

const translations = {
  en: {
    title: "What is your gender?",
    hint: "Double tap or press Enter to choose this option",
    continue: "Continue",
    back: "Back",
    selected: "Selected",
    male: "Male",
    female: "Female"
  },
  de: {
    title: "Was ist dein Geschlecht?",
    hint: "Doppeltippen oder Enter, um diese Option zu wählen",
    continue: "Weiter",
    back: "Zurück",
    selected: "Ausgewählt",
    male: "Männlich",
    female: "Weiblich"
  },
  fr: {
    title: "Quel est ton genre ?",
    hint: "Touchez deux fois ou appuyez sur Entrée pour choisir cette option",
    continue: "Continuer",
    back: "Retour",
    selected: "Sélectionné",
    male: "Homme",
    female: "Femme"
  },
  ru: {
    title: "Какой у тебя пол?",
    hint: "Дважды нажми или Enter, чтобы выбрать",
    continue: "Далее",
    back: "Назад",
    selected: "Выбрано",
    male: "Мужской",
    female: "Женский"
  }
};

const OnboardingGenderScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const setGender = useOnboardingStore((state) => state.setGender);
  const setFilters = usePreferencesStore((state) => state.setFilters);
  const [focusedCard, setFocusedCard] = useState<GenderValue | null>(null);
  const cardRefs = useRef<(FocusableCard | null)[]>([]);

  useEffect(() => {
    if (selectedGender === "male") {
      setFilters({ genders: ["female"] });
    } else if (selectedGender === "female") {
      setFilters({ genders: ["male"] });
    }
  }, [selectedGender, setFilters]);

  const focusCardByIndex = useCallback((nextIndex: number) => {
    const safeIndex = ((nextIndex % genderOptions.length) + genderOptions.length) % genderOptions.length;
    const ref = cardRefs.current[safeIndex];
    ref?.focus?.();
  }, []);

  const handleCardKeyDown = useCallback(
    (event: KeyPressEvent, currentIndex: number) => {
      const key = event.nativeEvent.key;
      if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault?.();
        focusCardByIndex(currentIndex + 1);
      }
      if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault?.();
        focusCardByIndex(currentIndex - 1);
      }
      if (key === " " || key === "Enter") {
        event.preventDefault?.();
        const option = genderOptions[currentIndex];
        setGender(option.value);
      }
    },
    [focusCardByIndex, setGender]
  );

  const handleContinue = () => {
    if (!selectedGender) {
      return;
    }
    navigation.navigate("OnboardingName");
  };

  const handleBack = () => {
    navigation.navigate("CreateAccount");
  };

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
        <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={copy.back}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="chevron-back" size={24} color={PALETTE.gold} />
        </Pressable>
        <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{copy.title}</Text>
          <View style={styles.cards} accessibilityRole="radiogroup">
            {genderOptions.map((option, index) => {
              const isSelected = selectedGender === option.value;
              const isFocused = focusedCard === option.value;
              const label = option.value === "male" ? copy.male : copy.female;
              return (
                <Pressable
                  key={option.value}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  onPress={() => setGender(option.value)}
                  onFocus={() => setFocusedCard(option.value)}
                  onBlur={() => setFocusedCard((value) => (value === option.value ? null : value))}
                  onKeyDown={(event) => handleCardKeyDown(event, index)}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isSelected }}
                  accessibilityHint={copy.hint}
                  focusable
                  style={({ pressed }) => [
                    styles.card,
                    isSelected && styles.cardSelected,
                    isFocused && styles.cardFocused,
                    pressed && styles.cardPressed
                  ]}
                >
                  <View style={styles.cardImageWrapper}>
                    <Image
                      source={option.image}
                      style={styles.cardImage}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      accessibilityRole="image"
                      accessibilityLabel={label}
                    />
                  </View>
                  <Text style={styles.cardLabel}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleContinue}
          disabled={!selectedGender}
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedGender }}
          accessibilityHint={selectedGender ? copy.continue : copy.hint}
          style={({ pressed }) => [
            styles.primaryButton,
            !selectedGender && styles.primaryButtonDisabled,
            pressed && selectedGender && styles.primaryButtonPressed
          ]}
        >
          <LinearGradient
            colors={[PALETTE.gold, "#8b6c2a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryInner}
          >
            <Text style={styles.primaryButtonText}>{copy.continue}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
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
    paddingHorizontal: 24,
    paddingBottom: 32
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 32
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  backButtonPressed: {
    opacity: 0.7
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999
  },
  progressFill: {
    width: "20%",
    height: "100%",
    backgroundColor: PALETTE.gold,
    borderRadius: 999
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: PALETTE.sand,
    marginBottom: 24,
    textAlign: "center"
  },
  cards: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap"
  },
  card: {
    flex: 1,
    minWidth: 140,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.5)",
    paddingVertical: 28,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  cardSelected: {
    borderColor: PALETTE.gold,
    backgroundColor: "rgba(28,93,68,0.22)",
    shadowColor: PALETTE.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4
  },
  cardFocused: {
    borderColor: PALETTE.gold
  },
  cardPressed: {
    transform: [{ scale: 0.98 }]
  },
  cardImageWrapper: {
    width: 120,
    height: 120,
    marginBottom: 16
  },
  cardImage: {
    width: "100%",
    height: "100%"
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: PALETTE.sand
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    backgroundColor: "transparent"
  },
  primaryInner: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonDisabled: {
    opacity: 0.65
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  helperText: {
    marginTop: 12,
    textAlign: "center",
    color: "#4a4a4a"
  }
});

export default OnboardingGenderScreen;
