import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import SafeAreaView from "../components/SafeAreaView";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useOnboardingStore } from "../state/onboardingStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { useAuthStore } from "../state/authStore";
import { upsertProfile } from "../services/profileService";
import { openWebDatePicker } from "../lib/webDatePicker";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};
const MIN_AGE = 18;
const MAX_AGE = 100;

type Props = NativeStackScreenProps<any>;

const subtractYears = (base: Date, years: number) => {
  const copy = new Date(base);
  copy.setFullYear(copy.getFullYear() - years);
  return copy;
};

const calculateAge = (birthDate: Date, reference: Date) => {
  let age = reference.getFullYear() - birthDate.getFullYear();
  const monthDiff = reference.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};

const clampDate = (date: Date, minDate: Date, maxDate: Date) => {
  if (date < minDate) {
    return minDate;
  }
  if (date > maxDate) {
    return maxDate;
  }
  return date;
};

const translations = {
  en: {
    title: "When is your birthday?",
    subtitle: "Your profile shows your age, not the exact date.",
    selectLabel: "Pick birth date",
    selectHint: "Opens the date picker",
    continue: "Continue",
    continueHint: "Continue to the next step",
    back: "Back",
    ageLabel: (age: number) => `${age} years old`,
    dateLocale: "en-US"
  },
  de: {
    title: "Wann hast du Geburtstag?",
    subtitle: "Dein Profil zeigt dein Alter, nicht dein Geburtsdatum.",
    selectLabel: "Geburtsdatum auswählen",
    selectHint: "Öffnet den Datumswähler",
    continue: "Weiter",
    continueHint: "Weiter zum nächsten Schritt",
    back: "Zurück",
    ageLabel: (age: number) => `${age} Jahre alt`,
    dateLocale: "de-DE"
  },
  fr: {
    title: "Quelle est ta date de naissance ?",
    subtitle: "Sur ton profil, nous montrons ton âge, pas la date exacte.",
    selectLabel: "Choisir la date de naissance",
    selectHint: "Ouvre le sélecteur de date",
    continue: "Continuer",
    continueHint: "Passer à l'étape suivante",
    back: "Retour",
    ageLabel: (age: number) => `${age} ans`,
    dateLocale: "fr-FR"
  },
  ru: {
    title: "Когда твой день рождения?",
    subtitle: "В профиле показываем только возраст, не дату.",
    selectLabel: "Выбрать дату рождения",
    selectHint: "Откроется выбор даты",
    continue: "Далее",
    continueHint: "Перейти к следующему шагу",
    back: "Назад",
    ageLabel: (age: number) => `${age} лет`,
    dateLocale: "ru-RU"
  }
};

const OnboardingBirthdayScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const name = useOnboardingStore((state) => state.name);
  const savedDob = useOnboardingStore((state) => state.dob);
  const setDob = useOnboardingStore((state) => state.setDob);
  const setAge = useOnboardingStore((state) => state.setAge);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(copy.dateLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }),
    [copy.dateLocale]
  );

  const today = useMemo(() => new Date(), []);
  const latestAllowed = useMemo(() => subtractYears(today, MIN_AGE), [today]);
  const earliestAllowed = useMemo(() => subtractYears(today, MAX_AGE), [today]);

  const initialDate = useMemo(() => {
    if (savedDob) {
      const parsed = new Date(savedDob);
      if (!Number.isNaN(parsed.getTime())) {
        return clampDate(parsed, earliestAllowed, latestAllowed);
      }
    }
    return latestAllowed;
  }, [earliestAllowed, latestAllowed, savedDob]);

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [showIOSPicker, setShowIOSPicker] = useState(Platform.OS === "ios");
  const [isSaving, setIsSaving] = useState(false);
  const [dateButtonFocused, setDateButtonFocused] = useState(false);

  useEffect(() => {
    if (!selectedGender) {
      navigation.replace("OnboardingGender");
      return;
    }
    if (!name.trim()) {
      navigation.replace("OnboardingName");
    }
  }, [name, navigation, selectedGender]);

  useEffect(() => {
    setSelectedDate(initialDate);
  }, [initialDate]);

  const age = useMemo(() => calculateAge(selectedDate, today), [selectedDate, today]);
  const isValidDate =
    selectedDate <= latestAllowed &&
    selectedDate >= earliestAllowed &&
    age >= MIN_AGE &&
    age <= MAX_AGE;

  const avatarSource = useMemo(() => {
    if (selectedGender === "female") {
      return require("../../assets/onboarding/step3/female_avatar_step_3.png");
    }
    return require("../../assets/onboarding/step3/male_avatar_step_3.png");
  }, [selectedGender]);

  const openPicker = useCallback(async () => {
    if (Platform.OS === "web") {
      const next = await openWebDatePicker({
        mode: "date",
        initial: selectedDate,
        min: earliestAllowed,
        max: latestAllowed
      });
      if (next) {
        setSelectedDate(clampDate(next, earliestAllowed, latestAllowed));
      }
      return;
    }
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: "date",
        display: "spinner",
        onChange: (_, date) => {
          if (date) {
            setSelectedDate(clampDate(date, earliestAllowed, latestAllowed));
          }
        },
        maximumDate: latestAllowed,
        minimumDate: earliestAllowed,
        locale: copy.dateLocale
      });
    } else {
      setShowIOSPicker(true);
    }
  }, [copy.dateLocale, earliestAllowed, latestAllowed, selectedDate]);

  const ensureProfileSeed = useCallback(
    async (birthdayIso: string) => {
      if (!session?.user?.id) {
        return;
      }
      if (profile) {
        return;
      }
      const phoneSuffix = session.user.phone?.replace(/\D/g, "").slice(-4);
      const fallbackName =
        name.trim() ||
        session.user.user_metadata?.display_name ||
        (phoneSuffix ? `User ${phoneSuffix}` : "Neues Profil");
      const resolvedGender = selectedGender ?? "male";
      try {
        await upsertProfile(session.user.id, {
          displayName: fallbackName,
          birthday: birthdayIso,
          bio: "",
          gender: resolvedGender,
          intention: "serious",
          interests: [],
          photos: []
        });
      } catch (error) {
        console.warn("[OnboardingBirthday] Failed to seed profile", error);
      }
    },
    [name, profile, selectedGender, session]
  );

  const handleContinue = async () => {
    if (!isValidDate || isSaving) {
      return;
    }
    const birthdayIso = selectedDate.toISOString();
    setDob(birthdayIso);
    setAge(age);
    setIsSaving(true);
    await ensureProfileSeed(birthdayIso);
    setIsSaving(false);
    navigation.navigate("OnboardingNotifications");
  };

  if (!selectedGender || !name.trim()) {
    return null;
  }

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
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

        <View style={styles.hero}>
          <Image source={avatarSource} style={styles.heroImage} resizeMode="contain" />
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={copy.selectLabel}
          accessibilityHint={copy.selectHint}
          onFocus={() => setDateButtonFocused(true)}
          onBlur={() => setDateButtonFocused(false)}
          style={[
            styles.dateField,
            dateButtonFocused && styles.dateFieldFocused,
            !isValidDate && styles.dateFieldInvalid
          ]}
        >
          <Text style={styles.dateText}>{dateFormatter.format(selectedDate)}</Text>
          <Text style={styles.ageText}>{copy.ageLabel(age)}</Text>
        </Pressable>

        {Platform.OS === "ios" && showIOSPicker && (
          <View style={styles.pickerWrapper}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              themeVariant="dark"
              textColor="#ffffff"
              onChange={(_, date) => {
                if (date) {
                  setSelectedDate(clampDate(date, earliestAllowed, latestAllowed));
                }
              }}
              maximumDate={latestAllowed}
              minimumDate={earliestAllowed}
              locale={copy.dateLocale}
              style={styles.datePicker}
            />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!isValidDate || isSaving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValidDate || isSaving }}
          accessibilityHint={isValidDate ? copy.continueHint : copy.selectHint}
          style={({ pressed }) => [
            styles.primaryButton,
            !isValidDate && styles.primaryButtonDisabled,
            pressed && isValidDate && styles.primaryButtonPressed
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
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    paddingBottom: 16
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
    width: "60%",
    height: "100%",
    backgroundColor: PALETTE.gold,
    borderRadius: 999
  },
  hero: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24
  },
  heroImage: {
    width: 200,
    height: 200
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: PALETTE.sand,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(242,231,215,0.8)",
    marginBottom: 24
  },
  dateField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  dateFieldFocused: {
    borderColor: PALETTE.gold,
    shadowColor: PALETTE.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4
  },
  dateFieldInvalid: {
    borderColor: "#e08585"
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff"
  },
  ageText: {
    fontSize: 14,
    color: "#ffffff"
  },
  pickerWrapper: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.1)",
    paddingVertical: 8,
    marginBottom: 20
  },
  datePicker: {
    width: "100%"
  },
  footer: {
    paddingHorizontal: 12,
    paddingBottom: 32,
    backgroundColor: "transparent"
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
  }
});

export default OnboardingBirthdayScreen;
