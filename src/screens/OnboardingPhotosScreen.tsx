import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useOnboardingStore } from "../state/onboardingStore";
import { useAuthStore } from "../state/authStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { registerPhoto, deletePhoto as deletePhotoRemote } from "../services/photoService";
import { mapProfile } from "../services/profileService";
import { PROFILE_BUCKET } from "../lib/storage";

const ACCENT_COLOR = "#0d6e4f";
const MAX_FILE_SIZE = 700 * 1024; // ~700KB to keep uploads fast on mobile
const MAX_DIMENSION = 1280; // downscale to speed up uploads
const GUIDELINES_URL = "https://tschetschenische.app/legal/photo-guidelines";

type Props = NativeStackScreenProps<any>;

type PhotoTile = {
  uri: string;
  width: number;
  height: number;
  type: ImageManipulator.SaveFormat;
  remoteKey: string | null;
  photoId: number | null;
  uploading: boolean;
  uploadError: string | null;
};

const translations = {
  en: {
    title: "Add at least one photo",
    subtitle: "We use the profile photo for verification. Choose one where your face is clearly visible!",
    profileLabel: "Profile photo",
    guidelines: ["Clear view", "Don't hide your face", "No group photos"],
    rulesLink: "Rules and Guidelines",
    rulesTitle: "Photo rules",
    rulesBody:
      "Use a clear, recent photo of yourself. No group photos, no minors, no violent/sexual/illegal content. Face must be visible. By adding photos, you confirm you own the rights and the content follows our policies.",
    continue: "Continue",
    skip: "Later",
    back: "Back",
    removePhoto: "Remove photo?",
    removeConfirm: "Remove",
    cancel: "Cancel",
    library: "Choose from library",
    camera: "Take a photo",
    selectionTitle: "Select source",
    permissionDenied: "Permission denied. Please enable it in settings.",
    uploadError: "Could not upload photos. Please try again.",
    instructions: "Tap to add, long press to remove.",
    sessionExpiredTitle: "Session expired",
    sessionExpiredMessage: "Please sign in again to upload your photos."
  },
  de: {
    title: "Füge mindestens ein Foto hinzu",
    subtitle: "Wir nutzen das Profilfoto zur Verifizierung. Wähle ein Foto, auf dem dein Gesicht gut sichtbar ist!",
    profileLabel: "Profilfoto",
    guidelines: ["Klarer Blick", "Versteck dein Gesicht nicht", "Keine Gruppenfotos"],
    rulesLink: "Regeln und Richtlinien",
    rulesTitle: "Foto-Regeln",
    rulesBody:
      "Nutze ein aktuelles, klares Foto von dir. Keine Gruppenfotos, keine Minderjährigen, kein Gewalt-/sexueller/illegaler Inhalt. Gesicht muss sichtbar sein. Mit dem Hochladen bestätigst du, dass du die Rechte hast und die Inhalte unseren Richtlinien entsprechen.",
    continue: "Weiter",
    skip: "Später",
    back: "Zurück",
    removePhoto: "Foto entfernen?",
    removeConfirm: "Entfernen",
    cancel: "Abbrechen",
    library: "Aus Galerie wählen",
    camera: "Foto aufnehmen",
    selectionTitle: "Quelle auswählen",
    permissionDenied: "Berechtigung verweigert. Bitte in den Einstellungen aktivieren.",
    uploadError: "Fotos konnten nicht hochgeladen werden. Bitte versuche es erneut.",
    instructions: "Tippen zum Hinzufügen, lange drücken zum Entfernen.",
    sessionExpiredTitle: "Sitzung abgelaufen",
    sessionExpiredMessage: "Bitte melde dich erneut an, um deine Fotos hochzuladen."
  },
  fr: {
    title: "Ajoute au moins une photo",
    subtitle: "Nous utilisons la photo de profil pour la vérification. Choisis une photo où ton visage est bien visible !",
    profileLabel: "Photo de profil",
    guidelines: ["Visage net", "Ne cache pas ton visage", "Pas de photos de groupe"],
    rulesLink: "Règles et directives",
    rulesTitle: "Règles photo",
    rulesBody:
      "Utilise une photo récente et claire de toi. Pas de photos de groupe, pas de mineurs, pas de contenu violent/sexuel/illégal. Le visage doit être visible. En ajoutant des photos, tu confirmes détenir les droits et respecter nos directives.",
    continue: "Continuer",
    skip: "Plus tard",
    back: "Retour",
    removePhoto: "Supprimer la photo ?",
    removeConfirm: "Supprimer",
    cancel: "Annuler",
    library: "Choisir dans la galerie",
    camera: "Prendre une photo",
    selectionTitle: "Choisir la source",
    permissionDenied: "Autorisation refusée. Active-la dans les réglages.",
    uploadError: "Impossible de téléverser les photos. Réessaie.",
    instructions: "Touchez pour ajouter, maintenez pour supprimer.",
    sessionExpiredTitle: "Session expirée",
    sessionExpiredMessage: "Merci de te reconnecter pour téléverser tes photos."
  },
  ru: {
    title: "Добавь хотя бы одно фото",
    subtitle: "Мы используем фото профиля для проверки. Выбери то, где хорошо видно твоё лицо!",
    profileLabel: "Фото профиля",
    guidelines: ["Чёткий взгляд", "Не скрывай лицо", "Без групповых фото"],
    rulesLink: "Правила и рекомендации",
    rulesTitle: "Правила для фото",
    rulesBody:
      "Используй своё недавнее, чёткое фото. Без групповых фото, без несовершеннолетних, без насилия/секса/незаконного контента. Лицо должно быть видно. Загружая фото, ты подтверждаешь права и соответствие правилам.",
    continue: "Далее",
    skip: "Позже",
    back: "Назад",
    removePhoto: "Удалить фото?",
    removeConfirm: "Удалить",
    cancel: "Отмена",
    library: "Выбрать из галереи",
    camera: "Сделать фото",
    selectionTitle: "Выбери источник",
    permissionDenied: "Разрешение отклонено. Включи его в настройках.",
    uploadError: "Не удалось загрузить фото. Попробуй ещё раз.",
    instructions: "Нажми, чтобы добавить; долго держи, чтобы удалить.",
    sessionExpiredTitle: "Сессия истекла",
    sessionExpiredMessage: "Пожалуйста, войди снова, чтобы загрузить фото."
  }
};

const useSupabase = () => {
  const client = useMemo(() => getSupabaseClient(), []);
  return client;
};

const OnboardingPhotosScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const supabase = useSupabase();
  const authSession = useAuthStore((state) => state.session);
  const currentProfile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const selectedGender = useOnboardingStore((state) => state.selectedGender);
  const name = useOnboardingStore((state) => state.name);
  const dob = useOnboardingStore((state) => state.dob);
  const locationStatus = useOnboardingStore((state) => state.location.status);
  const setPhotosUploaded = useOnboardingStore((state) => state.setPhotosUploaded);

  const [tiles, setTiles] = useState<(PhotoTile | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(authSession?.user?.id ?? null);
  const uploadTokens = useRef<Record<number, string>>({});
  const [showRules, setShowRules] = useState(false);

  const onboardingRedirect = useMemo(() => {
    if (!selectedGender) {
      return "OnboardingGender";
    }
    if (!name.trim()) {
      return "OnboardingName";
    }
    if (!dob) {
      return "OnboardingBirthday";
    }
    if (locationStatus === "idle") {
      return "OnboardingLocation";
    }
    return null;
  }, [dob, locationStatus, name, selectedGender]);

  useEffect(() => {
    if (authSession?.user?.id) {
      setSessionUserId(authSession.user.id);
    }
  }, [authSession?.user?.id]);

  useEffect(() => {
    let active = true;
    if (sessionUserId || !supabase) {
      return;
    }
    const hydrateUserId = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) {
          return;
        }
        if (data.session?.user?.id) {
          setSessionUserId(data.session.user.id);
          return;
        }
        const refreshed = await supabase.auth.refreshSession();
        if (!active) {
          return;
        }
        setSessionUserId(refreshed.data.session?.user?.id ?? null);
      } catch (error) {
        console.warn("[Photos] failed to fetch session user id", error);
      }
    };
    hydrateUserId();
    return () => {
      active = false;
    };
  }, [sessionUserId, supabase]);

  useEffect(() => {
    if (onboardingRedirect) {
      navigation.replace(onboardingRedirect);
    }
  }, [navigation, onboardingRedirect]);

  const ensureUserId = useCallback(async () => {
    const directId = authSession?.user?.id ?? sessionUserId;
    if (directId) {
      return directId;
    }
    if (!supabase) {
      return null;
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        setSessionUserId(data.session.user.id);
        return data.session.user.id;
      }
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.data.session?.user?.id) {
        setSessionUserId(refreshed.data.session.user.id);
        return refreshed.data.session.user.id;
      }
    } catch (error) {
      console.warn("[Photos] ensure user id failed", error);
    }
    return null;
  }, [authSession?.user?.id, sessionUserId, supabase]);

  const showSourcePicker = (index: number) => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [copy.camera, copy.library, copy.cancel],
          cancelButtonIndex: 2
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            pickImage(index, "camera");
          } else if (buttonIndex === 1) {
            pickImage(index, "library");
          }
        }
      );
    } else {
      Alert.alert(copy.selectionTitle, undefined, [
        { text: copy.camera, onPress: () => pickImage(index, "camera") },
        { text: copy.library, onPress: () => pickImage(index, "library") },
        { text: copy.cancel, style: "cancel" }
      ]);
    }
  };

  const ensurePermission = async (type: "camera" | "library") => {
    if (type === "camera") {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert(copy.permissionDenied);
      }
      return granted;
    }
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert(copy.permissionDenied);
    }
    return granted;
  };

  const queueTileUpload = useCallback(
    (index: number, manipulated: ImageManipulator.ImageResult, previousPhotoId: number | null) => {
      const token = `${index}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      uploadTokens.current[index] = token;

      setTiles((prev) => {
        const next = [...prev];
        next[index] = {
          uri: manipulated.uri,
          width: manipulated.width ?? 0,
          height: manipulated.height ?? 0,
          type: manipulated.format ?? ImageManipulator.SaveFormat.JPEG,
          remoteKey: null,
          photoId: null,
          uploading: true,
          uploadError: null
        };
        return next;
      });

      const runUpload = async () => {
        try {
          const userId = await ensureUserId();
          if (!userId) {
            setTiles((prev) => {
              const next = [...prev];
              next[index] = null;
              return next;
            });
            Alert.alert(copy.uploadError, copy.sessionExpiredMessage);
            navigation.replace("SignIn");
            return;
          }

          if (previousPhotoId) {
            try {
              await deletePhotoRemote(previousPhotoId);
            } catch (cleanupError) {
              console.warn("[Photos] failed to delete previous tile", cleanupError);
            }
          }

          const fileBuffer = await convertUriToArrayBuffer(manipulated.uri);
          const key = `${userId}/${Date.now()}_${index + 1}.jpg`;
          const supabaseUrl =
            (supabase as any)?.supabaseUrl ??
            process.env.EXPO_PUBLIC_SUPABASE_URL ??
            process.env.EXPO_SUPABASE_URL ??
            "";

          const uploadWithRetry = async (attempt = 0): Promise<void> => {
            try {
              const { error: uploadError } = await supabase.storage
                .from(PROFILE_BUCKET)
                .upload(key, fileBuffer, { contentType: "image/jpeg", upsert: true });
              if (!uploadError) {
                return;
              }
              console.error("[Photos] upload error", {
                attempt,
                message: uploadError.message,
                name: uploadError.name,
                status: (uploadError as any)?.status,
                statusText: (uploadError as any)?.statusText,
                supabaseUrl,
                key,
                bucket: PROFILE_BUCKET
              });
              const message = uploadError?.message?.toLowerCase() ?? "";
              const aborted =
                message.includes("abort") || message.includes("canceled") || message.includes("timeout") || message.includes("network");
              if (aborted && attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
                return uploadWithRetry(attempt + 1);
              }
              throw uploadError;
            } catch (err: any) {
              console.error("[Photos] upload threw", {
                attempt,
                message: err?.message,
                name: err?.name,
                stack: err?.stack,
                supabaseUrl,
                key,
                bucket: PROFILE_BUCKET
              });
              const message = err?.message?.toLowerCase?.() ?? "";
              const aborted =
                message.includes("abort") || message.includes("canceled") || message.includes("timeout") || message.includes("network");
              if (aborted && attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
                return uploadWithRetry(attempt + 1);
              }
              throw err;
            }
          };

          await uploadWithRetry();
          const { photoId } = await registerPhoto(key, "public");

          if (uploadTokens.current[index] !== token) {
            try {
              await deletePhotoRemote(photoId);
            } catch (cleanupError) {
              console.warn("[Photos] cleanup delete failed", cleanupError);
            }
            return;
          }

          setTiles((prev) => {
            const next = [...prev];
            const current = next[index];
            if (!current) {
              return prev;
            }
            next[index] = {
              ...current,
              remoteKey: key,
              photoId,
              uploading: false,
              uploadError: null
            };
            return next;
          });
        } catch (error: any) {
          console.error("[Photos] upload failed", error);
          if (uploadTokens.current[index] !== token) {
            return;
          }
          setTiles((prev) => {
            const next = [...prev];
            const current = next[index];
            if (!current) {
              return prev;
            }
            next[index] = {
              ...current,
              uploading: false,
              remoteKey: null,
              photoId: null,
              uploadError: copy.uploadError
            };
            return next;
          });
          Alert.alert(copy.uploadError, error?.message);
        }
      };

      runUpload();
    },
    [copy.sessionExpiredMessage, copy.uploadError, convertUriToArrayBuffer, ensureUserId, navigation, supabase]
  );

  const pickImage = async (index: number, source: "camera" | "library") => {
    const permission = await ensurePermission(source);
    if (!permission) {
      return;
    }

    try {
      const mediaTypeImages = ["images"] as const;

      const pickerResult =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: mediaTypeImages,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: mediaTypeImages,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1
            });

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      const asset = pickerResult.assets[0];
      const manipulated = await compressImage(asset.uri, asset.width ?? MAX_DIMENSION);
      if (!manipulated) {
        return;
      }
      const previousPhotoId = tiles[index]?.photoId ?? null;
      queueTileUpload(index, manipulated, previousPhotoId);
    } catch (error) {
      console.error("[Photos] picker error", error);
      Alert.alert(copy.uploadError);
    }
  };

  const compressImage = async (uri: string, width: number) => {
    try {
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        width ? [{ resize: { width: Math.min(width, MAX_DIMENSION) } }] : [],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );
      let info = await FileSystem.getInfoAsync(resized.uri);
      if (info.size && info.size > MAX_FILE_SIZE) {
        const further = await ImageManipulator.manipulateAsync(
          resized.uri,
          [{ resize: { width: Math.min(resized.width ?? MAX_DIMENSION, Math.floor(MAX_DIMENSION / 1.4)) } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        info = await FileSystem.getInfoAsync(further.uri);
        return further;
      }
      return resized;
    } catch (error) {
      console.warn("[Photos] compression failed", error);
      Alert.alert(copy.uploadError);
      return null;
    }
  };

  const removeTile = (index: number) => {
    const tileToRemove = tiles[index];
    Alert.alert(copy.removePhoto, undefined, [
      {
        text: copy.removeConfirm,
        style: "destructive",
        onPress: () => {
          uploadTokens.current[index] = `${index}-${Date.now()}-cleared`;
          setTiles((prev) => {
            const next = [...prev];
            next[index] = null;
            return next;
          });
          if (tileToRemove?.photoId) {
            deletePhotoRemote(tileToRemove.photoId).catch((error) =>
              console.warn("[Photos] failed to delete tile", error)
            );
          }
        }
      },
      { text: copy.cancel, style: "cancel" }
    ]);
  };

  const convertUriToArrayBuffer = useCallback(async (uri: string) => {
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error("failed-to-load-file");
      }
      return await response.arrayBuffer();
    } catch (error) {
      console.warn("[Photos] blob read failed, falling back to base64", error);
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        return decodeBase64(base64);
      } catch (fallbackError) {
        console.warn("[Photos] failed to convert file", fallbackError);
        throw fallbackError;
      }
    }
  }, []);

  const uploadPhotos = async () => {
    const primaryTile = tiles[0];
    if (!primaryTile || primaryTile.uploading || !primaryTile.remoteKey || !primaryTile.photoId) {
      return;
    }
    setLoading(true);
    try {
      const userId = await ensureUserId();
      if (!userId) {
        Alert.alert(copy.uploadError, copy.sessionExpiredMessage);
        navigation.replace("SignIn");
        return;
      }
      const now = new Date().toISOString();
      const newPhotos = tiles
        .map((tile) => {
          if (!tile?.photoId) {
            return null;
          }
          return {
            id: String(tile.photoId),
            assetId: tile.photoId,
            visibilityMode: "public",
            url: tile.uri,
            createdAt: now
          };
        })
        .filter((entry): entry is {
          id: string;
          assetId: number;
          visibilityMode: string;
          url: string | null;
          createdAt: string;
        } => Boolean(entry));

      const existingPhotos = currentProfile?.photos ?? [];
      const newAssetIds = new Set(newPhotos.map((photo) => photo.assetId));
      const preservedExisting = existingPhotos.filter((photo) => {
        const assetId =
          typeof photo.assetId === "number"
            ? photo.assetId
            : Number.isFinite(Number(photo.id))
              ? Number(photo.id)
              : null;
        if (assetId === null) {
          return true;
        }
        return !newAssetIds.has(assetId);
      });
      const mergedPhotos = [...preservedExisting, ...newPhotos];

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update({
          primary_photo_path: primaryTile.remoteKey,
          primary_photo_id: primaryTile.photoId,
          photos: mergedPhotos
        })
        .eq("id", userId)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      if (updatedProfile) {
        const mapped = mapProfile(updatedProfile);
        setProfile(mapped);
      }
      setPhotosUploaded(true);
      navigation.navigate("OnboardingVerify", {
        primaryPhotoPath: primaryTile.remoteKey,
        previewUri: primaryTile.uri
      });
    } catch (error: any) {
      console.error("[Photos] finalize upload error", error);
      if (error?.status === 401) {
        navigation.replace("SignIn");
        return;
      }
      Alert.alert(copy.uploadError, error?.message);
    } finally {
      setLoading(false);
    }
  };

  if (onboardingRedirect) {
    return null;
  }

  const primaryTile = tiles[0];
  const canContinue = Boolean(primaryTile?.photoId && !primaryTile?.uploading && !loading);

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
            <Ionicons name="chevron-back" size={24} color="#1f1f1f" />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <Text style={styles.instructions}>{copy.instructions}</Text>

        <View style={styles.tilesRow}>
          {tiles.map((tile, index) => (
            <View key={index.toString()} style={styles.tileWrapper}>
              <Pressable
                onPress={() => showSourcePicker(index)}
                onLongPress={() => tile && removeTile(index)}
                style={({ pressed }) => [
                  styles.tile,
                  pressed && styles.tilePressed,
                  index === 0 && styles.primaryTile
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  index === 0 ? `${copy.profileLabel}` : `${copy.title} ${index + 1}`
                }
              >
                {tile ? (
                  <>
                    <Image source={{ uri: tile.uri }} style={styles.tileImage} />
                    {tile.uploading && (
                      <View style={styles.tileOverlay}>
                        <ActivityIndicator color="#ffffff" />
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.plus}>+</Text>
                )}
              </Pressable>
              {tile?.uploadError && !tile.uploading && (
                <Text style={styles.tileErrorText}>{tile.uploadError}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.profileLabelChip}>
          <Text style={styles.profileLabelText}>{copy.profileLabel}</Text>
        </View>

        <View style={styles.guidelinesBox}>
          {copy.guidelines.map((item, idx) => (
            <View key={item} style={styles.guidelineRow}>
              <Ionicons name="checkmark-circle" size={18} color={ACCENT_COLOR} />
              <Text style={styles.guidelineText}>{item}</Text>
            </View>
          ))}
          <Pressable onPress={() => setShowRules(true)}>
            <Text style={styles.guidelineLink}>{copy.rulesLink}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={uploadPhotos}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          style={({ pressed }) => [
            styles.primaryButton,
            !canContinue && styles.primaryButtonDisabled,
            pressed && canContinue && styles.primaryButtonPressed
          ]}
        >
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>{copy.continue}</Text>}
        </Pressable>
      </View>

      <Modal visible={showRules} animationType="slide" onRequestClose={() => setShowRules(false)}>
        <SafeAreaView style={styles.modalSafe} edges={["top", "left", "right"]}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.modalClose} onPress={() => setShowRules(false)}>
              <Ionicons name="close" size={22} color="#1f2933" />
            </Pressable>
            <Text style={styles.modalTitle}>{copy.rulesTitle ?? copy.rulesLink}</Text>
            <View style={styles.modalClose} />
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalBody}>{copy.rulesBody}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    paddingHorizontal: 24,
    backgroundColor: "#ffffff"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24
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
    width: "98%",
    height: "100%",
    backgroundColor: ACCENT_COLOR,
    borderRadius: 999
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    textAlign: "center"
  },
  subtitle: {
    fontSize: 14,
    color: "#4a4a4a",
    textAlign: "center",
    marginTop: 8
  },
  instructions: {
    textAlign: "center",
    color: "#6b6b6b",
    marginTop: 8
  },
  tilesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    alignItems: "flex-start"
  },
  tileWrapper: {
    width: "31%",
    alignItems: "center"
  },
  tile: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d4d4d4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa"
  },
  tilePressed: {
    borderColor: ACCENT_COLOR
  },
  primaryTile: {
    borderColor: ACCENT_COLOR
  },
  plus: {
    fontSize: 40,
    color: "#bdbdbd"
  },
  tileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center"
  },
  tileErrorText: {
    fontSize: 11,
    color: "#d64550",
    textAlign: "center",
    marginTop: 6
  },
  profileLabelChip: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#eef5f1"
  },
  profileLabelText: {
    color: ACCENT_COLOR,
    fontWeight: "600",
    fontSize: 12
  },
  guidelinesBox: {
    marginTop: 32,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#dcdcdc",
    padding: 16,
    gap: 8
  },
  guidelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  guidelineText: {
    color: "#333",
    fontSize: 14
  },
  guidelineLink: {
    color: ACCENT_COLOR,
    fontWeight: "600",
    marginTop: 12
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#fff"
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#e4e6eb"
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2933"
  },
  modalScroll: {
    flex: 1
  },
  modalContent: {
    padding: 20,
    paddingTop: 32
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f2933"
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.select({ ios: 32, default: 24 }),
    backgroundColor: "#ffffff"
  },
  primaryButton: {
    backgroundColor: ACCENT_COLOR,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  primaryButtonDisabled: {
    backgroundColor: "#cfd8d3"
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600"
  },
  skipText: {
    textAlign: "center",
    color: "#4a4a4a",
    fontWeight: "500"
  }
});

export default OnboardingPhotosScreen;
