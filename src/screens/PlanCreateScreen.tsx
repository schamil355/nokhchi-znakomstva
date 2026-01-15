import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { useAuthStore } from "../state/authStore";
import { createPlan } from "../services/planService";
import { useQueryClient } from "@tanstack/react-query";
import { openWebDatePicker } from "../lib/webDatePicker";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const translations = {
  en: {
    title: "Create plan",
    fields: {
      dateType: "Date type",
      dateTypePlaceholder: "Coffee, dinner, walk...",
      areaLabel: "Area",
      areaLabelPlaceholder: "City or neighborhood",
      start: "Start time",
      end: "End time",
      vibes: "Vibe tags",
      vibesPlaceholder: "chill, active, cozy",
      budgetMin: "Min budget",
      budgetMax: "Max budget",
      notes: "Notes",
      notesPlaceholder: "Any details to share"
    },
    create: "Publish plan",
    saving: "Saving...",
    done: "Done",
    errors: {
      required: "Please fill in date type and area.",
      time: "End time must be after start time.",
      save: "Could not create plan. Please try again."
    },
    dateLocale: "en-US"
  },
  de: {
    title: "Plan erstellen",
    fields: {
      dateType: "Date-Art",
      dateTypePlaceholder: "Kaffee, Dinner, Spaziergang...",
      areaLabel: "Ort",
      areaLabelPlaceholder: "Stadt oder Viertel",
      start: "Startzeit",
      end: "Endzeit",
      vibes: "Stimmung",
      vibesPlaceholder: "entspannt, aktiv, cozy",
      budgetMin: "Budget min",
      budgetMax: "Budget max",
      notes: "Notizen",
      notesPlaceholder: "Details oder Wünsche"
    },
    create: "Plan veröffentlichen",
    saving: "Speichere...",
    done: "Fertig",
    errors: {
      required: "Bitte Date-Art und Ort ausfüllen.",
      time: "Endzeit muss nach der Startzeit liegen.",
      save: "Plan konnte nicht erstellt werden."
    },
    dateLocale: "de-DE"
  },
  fr: {
    title: "Créer un plan",
    fields: {
      dateType: "Type de rendez-vous",
      dateTypePlaceholder: "Café, dîner, balade...",
      areaLabel: "Lieu",
      areaLabelPlaceholder: "Ville ou quartier",
      start: "Début",
      end: "Fin",
      vibes: "Ambiances",
      vibesPlaceholder: "calme, actif, cosy",
      budgetMin: "Budget min",
      budgetMax: "Budget max",
      notes: "Notes",
      notesPlaceholder: "Détails à partager"
    },
    create: "Publier",
    saving: "Enregistrement...",
    done: "Terminé",
    errors: {
      required: "Merci d'indiquer le type et le lieu.",
      time: "La fin doit être après le début.",
      save: "Impossible de créer le plan."
    },
    dateLocale: "fr-FR"
  },
  ru: {
    title: "Создать план",
    fields: {
      dateType: "Тип встречи",
      dateTypePlaceholder: "Кофе, ужин, прогулка...",
      areaLabel: "Локация",
      areaLabelPlaceholder: "Город или район",
      start: "Начало",
      end: "Конец",
      vibes: "Настроение",
      vibesPlaceholder: "спокойно, активно, уютно",
      budgetMin: "Бюджет от",
      budgetMax: "Бюджет до",
      notes: "Заметки",
      notesPlaceholder: "Детали встречи"
    },
    create: "Опубликовать",
    saving: "Сохранение...",
    done: "Готово",
    errors: {
      required: "Заполни тип и локацию.",
      time: "Конец должен быть позже начала.",
      save: "Не удалось создать план."
    },
    dateLocale: "ru-RU"
  }
};

type Props = NativeStackScreenProps<any>;

const PlanCreateScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user?.id ?? "";

  const [dateType, setDateType] = useState("");
  const [areaLabel, setAreaLabel] = useState("");
  const [vibes, setVibes] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [iosPicker, setIosPicker] = useState<"start" | "end" | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatter = useMemo(
    () => new Intl.DateTimeFormat(copy.dateLocale, { dateStyle: "medium", timeStyle: "short" }),
    [copy.dateLocale]
  );

  const openPicker = useCallback(
    async (field: "start" | "end") => {
      const current = field === "start" ? startTime : endTime;

      if (Platform.OS === "web") {
        const next = await openWebDatePicker({
          mode: "datetime-local",
          initial: current
        });
        if (next) {
          field === "start" ? setStartTime(next) : setEndTime(next);
        }
        return;
      }

      if (Platform.OS === "android") {
        DateTimePickerAndroid.open({
          value: current,
          mode: "datetime",
          onChange: (_, date) => {
            if (!date) return;
            field === "start" ? setStartTime(date) : setEndTime(date);
          }
        });
        return;
      }

      setIosPicker(field);
    },
    [endTime, startTime]
  );

  const handleCreate = async () => {
    if (!dateType.trim() || !areaLabel.trim()) {
      Alert.alert(copy.errors.required);
      return;
    }
    if (endTime <= startTime) {
      Alert.alert(copy.errors.time);
      return;
    }
    if (!userId) {
      Alert.alert(copy.errors.save);
      return;
    }
    const vibeTags = vibes
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const minBudget = budgetMin ? Number(budgetMin) : null;
    const maxBudget = budgetMax ? Number(budgetMax) : null;

    setIsSaving(true);
    try {
      await createPlan(userId, {
        dateType,
        startTime,
        endTime,
        areaLabel,
        vibeTags,
        budgetMin: Number.isFinite(minBudget) ? minBudget : null,
        budgetMax: Number.isFinite(maxBudget) ? maxBudget : null,
        notes
      });
      await queryClient.invalidateQueries({ queryKey: ["plans", userId] });
      navigation.goBack();
    } catch (error) {
      Alert.alert(copy.errors.save);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={PALETTE.gold} />
          </Pressable>
          <Text style={styles.title}>{copy.title}</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{copy.fields.dateType}</Text>
          <TextInput
            value={dateType}
            onChangeText={setDateType}
            placeholder={copy.fields.dateTypePlaceholder}
            placeholderTextColor="rgba(242,231,215,0.4)"
            style={styles.input}
          />

          <Text style={styles.label}>{copy.fields.areaLabel}</Text>
          <TextInput
            value={areaLabel}
            onChangeText={setAreaLabel}
            placeholder={copy.fields.areaLabelPlaceholder}
            placeholderTextColor="rgba(242,231,215,0.4)"
            style={styles.input}
          />

          <Text style={styles.label}>{copy.fields.start}</Text>
          <Pressable onPress={() => openPicker("start")} style={styles.pickerButton}>
            <Ionicons name="calendar-outline" size={16} color={PALETTE.gold} />
            <Text style={styles.pickerText}>{formatter.format(startTime)}</Text>
          </Pressable>

          <Text style={styles.label}>{copy.fields.end}</Text>
          <Pressable onPress={() => openPicker("end")} style={styles.pickerButton}>
            <Ionicons name="time-outline" size={16} color={PALETTE.gold} />
            <Text style={styles.pickerText}>{formatter.format(endTime)}</Text>
          </Pressable>

          {Platform.OS === "ios" && iosPicker ? (
            <View style={styles.iosPickerBox}>
              <DateTimePicker
                value={iosPicker === "start" ? startTime : endTime}
                mode="datetime"
                display="spinner"
                themeVariant="dark"
                onChange={(_, date) => {
                  if (!date) return;
                  iosPicker === "start" ? setStartTime(date) : setEndTime(date);
                }}
              />
              <Pressable onPress={() => setIosPicker(null)} style={styles.iosDone}>
                <Text style={styles.iosDoneText}>{copy.done}</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.label}>{copy.fields.vibes}</Text>
          <TextInput
            value={vibes}
            onChangeText={setVibes}
            placeholder={copy.fields.vibesPlaceholder}
            placeholderTextColor="rgba(242,231,215,0.4)"
            style={styles.input}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{copy.fields.budgetMin}</Text>
              <TextInput
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="rgba(242,231,215,0.4)"
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>{copy.fields.budgetMax}</Text>
              <TextInput
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="rgba(242,231,215,0.4)"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>{copy.fields.notes}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={copy.fields.notesPlaceholder}
            placeholderTextColor="rgba(242,231,215,0.4)"
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Pressable
            onPress={handleCreate}
            disabled={isSaving}
            style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed, isSaving && styles.submitButtonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color={PALETTE.deep} />
            ) : (
              <Text style={styles.submitText}>{copy.create}</Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.4)"
  },
  title: {
    color: PALETTE.sand,
    fontSize: 18,
    fontWeight: "700"
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  label: {
    color: PALETTE.gold,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: PALETTE.sand,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.35)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  pickerText: {
    color: PALETTE.sand,
    fontSize: 13
  },
  iosPickerBox: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.1)"
  },
  iosDone: {
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(217, 192, 143, 0.15)"
  },
  iosDoneText: {
    color: PALETTE.sand,
    fontWeight: "600"
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top"
  },
  row: {
    flexDirection: "row",
    gap: 12
  },
  rowItem: {
    flex: 1
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: PALETTE.gold,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center"
  },
  submitButtonPressed: {
    opacity: 0.85
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitText: {
    color: PALETTE.deep,
    fontWeight: "700",
    fontSize: 14
  }
});

export default PlanCreateScreen;
