import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AlertButton
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import SafeAreaView from "../components/SafeAreaView";
import { useAuthStore } from "../state/authStore";
import { RelationshipCompass, RelationshipCompassKey, RELATIONSHIP_COMPASS_KEYS } from "../types";
import { upsertProfile } from "../services/profileService";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

type Props = NativeStackScreenProps<any>;

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  mist: "rgba(255,255,255,0.08)"
};

type CopyShape = {
  title: string;
  subtitle: string;
  save: string;
  saving: string;
  savedTitle: string;
  savedMessage: string;
  errorTitle: string;
  saveError: string;
  loading: string;
  emptyValue: string;
  notSpecified: string;
  cancel: string;
  questions: Record<
    RelationshipCompassKey,
    {
      title: string;
      options: Record<string, string>;
    }
  >;
};

const translations: Record<string, CopyShape> = {
  en: {
    title: "Relationship compass",
    subtitle: "Optional. Share your values and pace.",
    save: "Save compass",
    saving: "Saving...",
    savedTitle: "Saved",
    savedMessage: "Your compass was updated.",
    errorTitle: "Error",
    saveError: "Could not save the compass.",
    loading: "Loading...",
    emptyValue: "Select",
    notSpecified: "Prefer not to say",
    cancel: "Cancel",
    questions: {
      timeline: {
        title: "Timeline to commitment",
        options: {
          fast: "Quickly",
          steady: "Steady pace",
          slow: "Slowly",
          no_timeline: "No timeline"
        }
      },
      familyCloseness: {
        title: "Family closeness in daily life",
        options: {
          very_close: "Very important",
          close: "Important",
          neutral: "Neutral",
          independent: "Prefer independence"
        }
      },
      religiousPractice: {
        title: "Religious practice",
        options: {
          practicing: "Practicing",
          occasional: "Occasional/spiritual",
          cultural: "Cultural",
          not_religious: "Not religious",
          private: "Prefer private"
        }
      },
      relocation: {
        title: "Location & relocation",
        options: {
          stay: "Prefer to stay",
          open_national: "Open within country",
          open_international: "Open internationally",
          flexible: "Flexible"
        }
      },
      familyIntro: {
        title: "Family intro pace",
        options: {
          early: "Early",
          some_months: "After a few months",
          when_sure: "When it feels right",
          private: "Prefer private"
        }
      },
      roles: {
        title: "Roles in daily life",
        options: {
          traditional: "More traditional",
          mixed: "Mixed",
          modern: "More modern",
          depends: "Depends on the situation"
        }
      },
      lifestyle: {
        title: "Lifestyle rhythm",
        options: {
          homebody: "Home-oriented/quiet",
          balanced: "Balanced",
          active: "Active/on the go",
          career_focus: "Career-focused"
        }
      }
    }
  },
  de: {
    title: "Beziehungs-Kompass",
    subtitle: "Optional. Zeig deine Werte und dein Tempo.",
    save: "Kompass speichern",
    saving: "Speichern...",
    savedTitle: "Gespeichert",
    savedMessage: "Dein Kompass wurde aktualisiert.",
    errorTitle: "Fehler",
    saveError: "Kompass konnte nicht gespeichert werden.",
    loading: "Lade...",
    emptyValue: "Auswählen",
    notSpecified: "Keine Angabe",
    cancel: "Abbrechen",
    questions: {
      timeline: {
        title: "Tempo bis Verbindlichkeit",
        options: {
          fast: "Schnell",
          steady: "Normales Tempo",
          slow: "Langsam",
          no_timeline: "Kein Zeitplan"
        }
      },
      familyCloseness: {
        title: "Familiennähe im Alltag",
        options: {
          very_close: "Sehr wichtig",
          close: "Wichtig",
          neutral: "Neutral",
          independent: "Eher unabhängig"
        }
      },
      religiousPractice: {
        title: "Religiöse Praxis",
        options: {
          practicing: "Praktizierend",
          occasional: "Gelegentlich/spirituell",
          cultural: "Kulturell",
          not_religious: "Nicht religiös",
          private: "Lieber privat"
        }
      },
      relocation: {
        title: "Wohnort & Umzug",
        options: {
          stay: "Möchte bleiben",
          open_national: "Offen national",
          open_international: "Offen international",
          flexible: "Flexibel"
        }
      },
      familyIntro: {
        title: "Familien-Intro-Tempo",
        options: {
          early: "Früh",
          some_months: "Nach einigen Monaten",
          when_sure: "Wenn es sich sicher anfühlt",
          private: "Lieber privat"
        }
      },
      roles: {
        title: "Rollenverständnis im Alltag",
        options: {
          traditional: "Eher traditionell",
          mixed: "Gemischt",
          modern: "Eher modern",
          depends: "Situationsabhängig"
        }
      },
      lifestyle: {
        title: "Lebensstil-Rhythmus",
        options: {
          homebody: "Häuslich/ruhig",
          balanced: "Ausgewogen",
          active: "Aktiv/unterwegs",
          career_focus: "Karrierefokus"
        }
      }
    }
  },
  fr: {
    title: "Compas relationnel",
    subtitle: "Optionnel. Partage tes valeurs et ton rythme.",
    save: "Enregistrer le compas",
    saving: "Enregistrement...",
    savedTitle: "Enregistré",
    savedMessage: "Ton compas a été mis à jour.",
    errorTitle: "Erreur",
    saveError: "Impossible d'enregistrer le compas.",
    loading: "Chargement...",
    emptyValue: "Choisir",
    notSpecified: "Je préfère ne pas répondre",
    cancel: "Annuler",
    questions: {
      timeline: {
        title: "Rythme vers l'engagement",
        options: {
          fast: "Rapide",
          steady: "Rythme normal",
          slow: "Lent",
          no_timeline: "Pas de calendrier"
        }
      },
      familyCloseness: {
        title: "Proximité familiale au quotidien",
        options: {
          very_close: "Très important",
          close: "Important",
          neutral: "Neutre",
          independent: "Plutôt indépendant"
        }
      },
      religiousPractice: {
        title: "Pratique religieuse",
        options: {
          practicing: "Pratiquant",
          occasional: "Occasionnel/spirituel",
          cultural: "Culturel",
          not_religious: "Pas religieux",
          private: "Plutôt privé"
        }
      },
      relocation: {
        title: "Lieu de vie & déménagement",
        options: {
          stay: "Je veux rester",
          open_national: "Ouvert dans le pays",
          open_international: "Ouvert à l'international",
          flexible: "Flexible"
        }
      },
      familyIntro: {
        title: "Rythme d'introduction à la famille",
        options: {
          early: "Tôt",
          some_months: "Après quelques mois",
          when_sure: "Quand c'est sûr",
          private: "Plutôt privé"
        }
      },
      roles: {
        title: "Rôles au quotidien",
        options: {
          traditional: "Plutôt traditionnel",
          mixed: "Mixte",
          modern: "Plutôt moderne",
          depends: "Selon la situation"
        }
      },
      lifestyle: {
        title: "Rythme de vie",
        options: {
          homebody: "Calme/à la maison",
          balanced: "Équilibré",
          active: "Actif/en mouvement",
          career_focus: "Focus carrière"
        }
      }
    }
  },
  ru: {
    title: "Компас отношений",
    subtitle: "Необязательно. Покажи ценности и темп.",
    save: "Сохранить компас",
    saving: "Сохраняем...",
    savedTitle: "Сохранено",
    savedMessage: "Компас обновлен.",
    errorTitle: "Ошибка",
    saveError: "Не удалось сохранить компас.",
    loading: "Загрузка...",
    emptyValue: "Выбрать",
    notSpecified: "Не хочу отвечать",
    cancel: "Отмена",
    questions: {
      timeline: {
        title: "Темп до серьёзности",
        options: {
          fast: "Быстро",
          steady: "Спокойно",
          slow: "Медленно",
          no_timeline: "Без сроков"
        }
      },
      familyCloseness: {
        title: "Близость к семье в быту",
        options: {
          very_close: "Очень важно",
          close: "Важно",
          neutral: "Нейтрально",
          independent: "Скорее независим(а)"
        }
      },
      religiousPractice: {
        title: "Религиозная практика",
        options: {
          practicing: "Практикую",
          occasional: "Иногда/духовно",
          cultural: "Культурно",
          not_religious: "Не религиозен(на)",
          private: "Предпочитаю не говорить"
        }
      },
      relocation: {
        title: "Город и переезд",
        options: {
          stay: "Хочу остаться",
          open_national: "Открыт(а) внутри страны",
          open_international: "Открыт(а) к переезду за границу",
          flexible: "Гибко"
        }
      },
      familyIntro: {
        title: "Темп знакомства с семьёй",
        options: {
          early: "Рано",
          some_months: "Через несколько месяцев",
          when_sure: "Когда будет уверенность",
          private: "Предпочитаю приватно"
        }
      },
      roles: {
        title: "Роли в быту",
        options: {
          traditional: "Скорее традиционно",
          mixed: "Смешанный вариант",
          modern: "Скорее современно",
          depends: "Зависит от ситуации"
        }
      },
      lifestyle: {
        title: "Ритм жизни",
        options: {
          homebody: "Домашний/спокойный",
          balanced: "Сбалансированный",
          active: "Активный",
          career_focus: "Фокус на карьере"
        }
      }
    }
  }
};

type CompassOption = {
  value: RelationshipCompass[RelationshipCompassKey];
  label: string;
};

const RelationshipCompassScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const errorCopy = useErrorCopy();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const [answers, setAnswers] = useState<RelationshipCompass>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAnswers(profile?.relationshipCompass ?? {});
  }, [profile?.relationshipCompass]);

  const questionConfig = useMemo<Record<RelationshipCompassKey, { title: string; options: CompassOption[] }>>(
    () => ({
      timeline: {
        title: copy.questions.timeline.title,
        options: [
          { value: "fast", label: copy.questions.timeline.options.fast },
          { value: "steady", label: copy.questions.timeline.options.steady },
          { value: "slow", label: copy.questions.timeline.options.slow },
          { value: "no_timeline", label: copy.questions.timeline.options.no_timeline }
        ]
      },
      familyCloseness: {
        title: copy.questions.familyCloseness.title,
        options: [
          { value: "very_close", label: copy.questions.familyCloseness.options.very_close },
          { value: "close", label: copy.questions.familyCloseness.options.close },
          { value: "neutral", label: copy.questions.familyCloseness.options.neutral },
          { value: "independent", label: copy.questions.familyCloseness.options.independent }
        ]
      },
      religiousPractice: {
        title: copy.questions.religiousPractice.title,
        options: [
          { value: "practicing", label: copy.questions.religiousPractice.options.practicing },
          { value: "occasional", label: copy.questions.religiousPractice.options.occasional },
          { value: "cultural", label: copy.questions.religiousPractice.options.cultural },
          { value: "not_religious", label: copy.questions.religiousPractice.options.not_religious },
          { value: "private", label: copy.questions.religiousPractice.options.private }
        ]
      },
      relocation: {
        title: copy.questions.relocation.title,
        options: [
          { value: "stay", label: copy.questions.relocation.options.stay },
          { value: "open_national", label: copy.questions.relocation.options.open_national },
          { value: "open_international", label: copy.questions.relocation.options.open_international },
          { value: "flexible", label: copy.questions.relocation.options.flexible }
        ]
      },
      familyIntro: {
        title: copy.questions.familyIntro.title,
        options: [
          { value: "early", label: copy.questions.familyIntro.options.early },
          { value: "some_months", label: copy.questions.familyIntro.options.some_months },
          { value: "when_sure", label: copy.questions.familyIntro.options.when_sure },
          { value: "private", label: copy.questions.familyIntro.options.private }
        ]
      },
      roles: {
        title: copy.questions.roles.title,
        options: [
          { value: "traditional", label: copy.questions.roles.options.traditional },
          { value: "mixed", label: copy.questions.roles.options.mixed },
          { value: "modern", label: copy.questions.roles.options.modern },
          { value: "depends", label: copy.questions.roles.options.depends }
        ]
      },
      lifestyle: {
        title: copy.questions.lifestyle.title,
        options: [
          { value: "homebody", label: copy.questions.lifestyle.options.homebody },
          { value: "balanced", label: copy.questions.lifestyle.options.balanced },
          { value: "active", label: copy.questions.lifestyle.options.active },
          { value: "career_focus", label: copy.questions.lifestyle.options.career_focus }
        ]
      }
    }),
    [copy]
  );

  const setAnswer = useCallback((key: RelationshipCompassKey, value: CompassOption["value"] | null) => {
    setAnswers((prev) => {
      if (!value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: value
      };
    });
  }, []);

  const openOptions = useCallback(
    (key: RelationshipCompassKey) => {
      const question = questionConfig[key];
      const optionLabels = question.options.map((option) => option.label);
      const notSpecifiedIndex = optionLabels.length;
      const cancelButtonIndex = optionLabels.length + 1;
      const labels = [...optionLabels, copy.notSpecified, copy.cancel];

      const onSelect = (index: number) => {
        if (index === cancelButtonIndex) {
          return;
        }
        if (index === notSpecifiedIndex) {
          setAnswer(key, null);
          return;
        }
        const option = question.options[index];
        if (option) {
          setAnswer(key, option.value);
        }
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions({ options: labels, cancelButtonIndex }, onSelect);
      } else {
        const buttons: AlertButton[] = labels.map((label, index) => ({
          text: label,
          style: index === cancelButtonIndex ? "cancel" : "default",
          onPress: () => onSelect(index)
        }));
        Alert.alert(question.title, undefined, buttons);
      }
    },
    [copy.cancel, copy.notSpecified, questionConfig, setAnswer]
  );

  const handleSave = useCallback(async () => {
    if (!session?.user?.id || !profile || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      const nextCompass = Object.keys(answers).length ? answers : null;
      const updated = await upsertProfile(session.user.id, {
        displayName: profile.displayName,
        birthday: profile.birthday,
        bio: profile.bio ?? "",
        gender: profile.gender,
        intention: profile.intention,
        interests: profile.interests ?? [],
        photos: profile.photos ?? [],
        primaryPhotoPath: profile.primaryPhotoPath ?? null,
        primaryPhotoId: profile.primaryPhotoId ?? null,
        relationshipCompass: nextCompass
      });
      setProfile(updated);
      Alert.alert(copy.savedTitle, copy.savedMessage);
    } catch (error: any) {
      logError(error, "relationship-compass-save");
      Alert.alert(copy.errorTitle, getErrorMessage(error, errorCopy, copy.saveError));
    } finally {
      setIsSaving(false);
    }
  }, [answers, copy, errorCopy, isSaving, profile, session?.user?.id, setProfile]);

  if (!session || !profile) {
    return (
      <LinearGradient
        colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
        locations={[0, 0.55, 1]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <Text style={styles.loadingText}>{copy.loading}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={PALETTE.sand} />
          </Pressable>
          <Text style={styles.title}>{copy.title}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
          <View style={styles.card}>
            {RELATIONSHIP_COMPASS_KEYS.map((key) => {
              const question = questionConfig[key];
              const currentValue = answers[key];
              const currentLabel =
                question.options.find((option) => option.value === currentValue)?.label ?? copy.emptyValue;
              const isSelected = Boolean(currentValue);
              return (
                <Pressable
                  key={key}
                  onPress={() => openOptions(key)}
                  style={({ pressed }) => [
                    styles.questionRow,
                    pressed && styles.questionRowPressed
                  ]}
                >
                  <View style={styles.questionText}>
                    <Text style={styles.questionTitle}>{question.title}</Text>
                    <Text style={[styles.questionValue, !isSelected && styles.questionPlaceholder]}>
                      {currentLabel}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={PALETTE.gold} />
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? copy.saving : copy.save}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default RelationshipCompassScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6
  },
  backButton: {
    marginRight: 6,
    padding: 6
  },
  title: {
    color: PALETTE.sand,
    fontSize: 20,
    fontWeight: "700"
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  subtitle: {
    color: "rgba(242,231,215,0.75)",
    fontSize: 14,
    marginBottom: 16
  },
  card: {
    backgroundColor: PALETTE.mist,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.18)",
    paddingVertical: 8
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  questionRowPressed: {
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  questionText: {
    flex: 1,
    paddingRight: 12
  },
  questionTitle: {
    color: PALETTE.sand,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6
  },
  questionValue: {
    color: PALETTE.sand,
    fontSize: 14
  },
  questionPlaceholder: {
    color: "rgba(242,231,215,0.55)"
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: PALETTE.gold,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center"
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  saveButtonText: {
    color: "#0b1f16",
    fontSize: 16,
    fontWeight: "700"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    color: PALETTE.sand,
    fontSize: 16
  }
});
