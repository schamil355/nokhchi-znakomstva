import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { ensureFreshSession, getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl } from "../lib/storage";
import { useAuthStore } from "../state/authStore";

const BACKGROUND_COLOR = "#ffffff";
const TEXT_PRIMARY = "#050709";
const TEXT_SECONDARY = "#4d515a";
const CTA_COLOR = "#0d6e4f";
const GUIDELINE_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "scan-outline",
  "sunny-outline",
  "hand-left-outline",
  "resize-outline"
];
const verifyBadge = require("../../assets/onboarding/verify-badge.png");

type Props = NativeStackScreenProps<any>;

const translations = {
  en: {
    title: "Verify yourself",
    subtitle: "Verified profiles receive three times more likes and matches.",
    guidelines: [
      "Photos must match the scan.",
      "Ensure good lighting.",
      "Don't cover your face.",
      "Stay close to the camera."
    ],
    back: "Back",
    verify: "Verify profile",
    changePhoto: "Not you in this photo? Change it",
    loading: "Loading photo...",
    error: "We couldn't load your profile photo. Please add one first.",
    badgeAlt: "Verification badge",
    heroAlt: "Profile photo",
    instructions: "Tap verify to start a selfie scan.",
    rulesLink: "Rules and Guidelines",
    consent: "By verifying, you consent to biometric processing for ID verification."
  },
  de: {
    title: "Verifiziere dich",
    subtitle: "Verifizierte Profile erhalten dreimal mehr Likes und Matches.",
    guidelines: [
      "Die Fotos müssen mit dem Scan übereinstimmen.",
      "Das Licht sollte gut sein.",
      "Verdecke nicht dein Gesicht.",
      "Bleib nah an der Kamera."
    ],
    back: "Zurück",
    verify: "Profil verifizieren",
    changePhoto: "Nicht du auf diesem Foto? Ändere es",
    loading: "Lade Foto...",
    error: "Wir konnten dein Profilfoto nicht laden. Bitte füge zuerst eines hinzu.",
    badgeAlt: "Verifizierungsabzeichen",
    heroAlt: "Profilfoto",
    instructions: "Tippe auf Verifizieren, um den Selfie-Scan zu starten.",
    rulesLink: "Regeln und Richtlinien",
    consent: "Mit der Verifizierung stimmst du der biometrischen Prüfung zu."
  },
  fr: {
    title: "Vérifie ton profil",
    subtitle: "Les profils vérifiés reçoivent trois fois plus de likes et de matchs.",
    guidelines: [
      "Les photos doivent correspondre au scan.",
      "La lumière doit être bonne.",
      "Ne cache pas ton visage.",
      "Reste près de la caméra."
    ],
    back: "Retour",
    verify: "Vérifier le profil",
    changePhoto: "Ce n'est pas toi sur cette photo ? Modifie-la",
    loading: "Chargement de la photo...",
    error: "Impossible de charger ta photo de profil. Ajoute-en une d'abord.",
    badgeAlt: "Badge de vérification",
    heroAlt: "Photo de profil",
    instructions: "Appuie sur Vérifier pour lancer le scan selfie.",
    rulesLink: "Règles et directives",
    consent: "En vérifiant, tu consens au traitement biométrique pour la vérification."
  },
  ru: {
    title: "Подтверди себя",
    subtitle: "Подтверждённые профили получают в три раза больше лайков и матчей.",
    guidelines: [
      "Фото должны совпадать с селфи-сканом.",
      "Нужно хорошее освещение.",
      "Не закрывай лицо.",
      "Держись ближе к камере."
    ],
    back: "Назад",
    verify: "Подтвердить профиль",
    changePhoto: "Не ты на фото? Измени его",
    loading: "Загружаю фото...",
    error: "Не удалось загрузить фото профиля. Сначала добавь его.",
    badgeAlt: "Значок подтверждения",
    heroAlt: "Фото профиля",
    instructions: "Нажми 'Подтвердить', чтобы пройти селфи-скан.",
    rulesLink: "Правила и рекомендации",
    consent: "Подтверждая, вы соглашаетесь на биометрическую проверку."
  }
};

const supabase = getSupabaseClient();

const OnboardingVerifyScreen = ({ navigation, route }: Props) => {
  const copy = useLocalizedCopy(translations);
  const initSession = useAuthStore((state) => state.session);
  const [photoUrl, setPhotoUrl] = useState<string | null>(route?.params?.previewUri ?? null);
  const [primaryPhotoPath, setPrimaryPhotoPath] = useState<string | null>(
    route?.params?.primaryPhotoPath ?? null
  );
  const [loading, setLoading] = useState(!route?.params?.previewUri);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadPhoto = async () => {
      if (photoUrl && primaryPhotoPath) {
        setLoading(false);
        return;
      }
      try {
        const fallbackSession = initSession ?? null;
        const { session } = await ensureFreshSession();
        const activeSession = session ?? fallbackSession;
        if (!activeSession?.user?.id) {
          throw new Error("no-session");
        }
        let path = primaryPhotoPath;
        if (!path) {
          const { data } = await supabase
            .from("profiles")
            .select("primary_photo_path")
            .eq("id", activeSession.user.id)
            .maybeSingle();
          path = data?.primary_photo_path ?? null;
          if (!path) {
            const { data: fallbackPhoto } = await supabase
              .from("photo_assets")
              .select("storage_path")
              .eq("owner_id", activeSession.user.id)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (!fallbackPhoto?.storage_path) {
              throw new Error("no-photo");
            }
            path = fallbackPhoto.storage_path;
          }
        }
        const url = await getPhotoUrl(path, supabase);
        if (!url) {
          throw new Error("photo-url");
        }
        if (mounted) {
          setPrimaryPhotoPath(path);
          setPhotoUrl(url);
        }
      } catch {
        if (mounted) {
          setError(copy.error);
          navigation.replace("OnboardingPhotos");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    loadPhoto();
    return () => {
      mounted = false;
    };
  }, [copy.error, initSession, navigation, photoUrl, primaryPhotoPath]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="chevron-back" size={28} color={TEXT_PRIMARY} />
          </Pressable>
        </View>

        <View style={styles.heroWrapper}>
          <View style={styles.heroInner}>
            <View style={styles.photoRing}>
              {loading ? (
                <ActivityIndicator color={CTA_COLOR} />
              ) : photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.photo} accessibilityLabel={copy.heroAlt} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person" size={48} color="#9aa1ab" />
                </View>
              )}
            </View>
            <Image source={verifyBadge} style={styles.badgeImage} accessibilityLabel={copy.badgeAlt} />
          </View>
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {error && (
          <Text style={styles.errorText} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}

        <View style={styles.guidelinesBox}>
          {copy.guidelines.map((text, idx) => (
            <View key={text} style={styles.guidelineRow}>
              <View style={styles.guidelineIconWrap}>
                <Ionicons
                  name={GUIDELINE_ICONS[idx] ?? "information-circle-outline"}
                  size={16}
                  color={TEXT_PRIMARY}
                />
              </View>
              <Text style={styles.guidelineText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => navigation.navigate("SelfieScan", { profilePath: primaryPhotoPath })}
          disabled={!photoUrl || !primaryPhotoPath || loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: !photoUrl || !primaryPhotoPath || loading }}
          style={({ pressed }) => [
            styles.primaryButton,
            (!photoUrl || !primaryPhotoPath || loading) && styles.primaryButtonDisabled,
            pressed && photoUrl && primaryPhotoPath && styles.primaryButtonPressed
          ]}
        >
          <Text style={styles.primaryButtonText}>{copy.verify}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.replace("OnboardingPhotos")}>
          <Text style={styles.changePhotoText}>{copy.changePhoto}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    backgroundColor: BACKGROUND_COLOR
  },
  header: {
    alignItems: "flex-start",
    marginBottom: 12
  },
  backButton: {
    padding: 6,
    marginLeft: -12,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonPressed: {
    opacity: 0.7
  },
  heroWrapper: {
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginTop: 8,
    width: "100%",
    paddingBottom: 12
  },
  heroInner: {
    width: 120,
    height: 140,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    position: "relative"
  },
  photoRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 999
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f2f6"
  },
  badgeImage: {
    position: "absolute",
    width: 130,
    height: 130,
    bottom: -28,
    right: -48,
    resizeMode: "contain"
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "left",
    color: TEXT_PRIMARY
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "left",
    marginTop: 6
  },
  errorText: {
    textAlign: "center",
    color: "#d64550",
    marginTop: 12
  },
  guidelinesBox: {
    marginTop: 18,
    paddingHorizontal: 4,
    gap: 14
  },
  guidelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  guidelineIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f4f5f8",
    borderWidth: 1,
    borderColor: "#e4e6eb",
    alignItems: "center",
    justifyContent: "center"
  },
  guidelineText: {
    fontSize: 12,
    color: TEXT_PRIMARY
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: BACKGROUND_COLOR
  },
  primaryButton: {
    backgroundColor: CTA_COLOR,
    borderRadius: 32,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: CTA_COLOR,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  primaryButtonDisabled: {
    backgroundColor: "rgba(13,110,79,0.35)",
    shadowOpacity: 0
  },
  primaryButtonPressed: {
    opacity: 0.85
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  changePhotoText: {
    textAlign: "center",
    color: TEXT_PRIMARY,
    fontWeight: "600",
    textDecorationLine: "underline"
  }
});

export default OnboardingVerifyScreen;
