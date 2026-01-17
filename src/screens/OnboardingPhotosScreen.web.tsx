import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView
} from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useOnboardingStore } from "../state/onboardingStore";
import { useAuthStore } from "../state/authStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { registerPhoto, deletePhoto as deletePhotoRemote } from "../services/photoService";
import { mapProfile } from "../services/profileService";
import { PROFILE_BUCKET } from "../lib/storage";
import { onboardingPhotosTranslations as translations } from "./onboardingPhotosCopy";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

type Props = NativeStackScreenProps<any>;

type PhotoTile = {
  uri: string;
  width: number;
  height: number;
  type: string;
  remoteKey: string | null;
  photoId: number | null;
  file?: File | null;
  uploading: boolean;
  uploadError: string | null;
};

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
  format?: string | null;
  file?: File | null;
};

const useSupabase = () => {
  const client = useMemo(() => getSupabaseClient(), []);
  return client;
};

const revokeObjectUrl = (uri?: string | null) => {
  if (!uri) {
    return;
  }
  if (uri.startsWith("blob:")) {
    URL.revokeObjectURL(uri);
  }
};

const isHeicFile = (file: File) => {
  const type = file.type?.toLowerCase() ?? "";
  if (type === "image/heic" || type === "image/heif") {
    return true;
  }
  const name = file.name?.toLowerCase() ?? "";
  return name.endsWith(".heic") || name.endsWith(".heif");
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });

const convertHeicToJpeg = async (file: File): Promise<File | null> => {
  if (typeof document === "undefined") {
    return null;
  }
  let sourceUrl: string | null = null;
  try {
    sourceUrl = URL.createObjectURL(file);
    const img = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 1;
    canvas.height = img.naturalHeight || img.height || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) {
      return null;
    }
    const safeName = file.name?.trim()
      ? file.name.replace(/\.(heic|heif)$/i, ".jpg")
      : `photo-${Date.now()}.jpg`;
    return new File([blob], safeName, { type: "image/jpeg" });
  } catch (error) {
    console.warn("[Photos] heic convert failed", error);
    return null;
  } finally {
    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
  }
};

const OnboardingPhotosScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const errorCopy = useErrorCopy();
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
  const longPressTimers = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({});
  const longPressFired = useRef<Record<number, boolean>>({});
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

  const pickImageWeb = async (): Promise<SelectedImage | null> => {
    if (typeof document === "undefined") {
      Alert.alert(copy.uploadError);
      return null;
    }
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.position = "fixed";
      input.style.left = "-9999px";
      let settled = false;

      const cleanup = () => {
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      };

      const finish = (result: SelectedImage | null) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(result);
      };

      input.onchange = async () => {
        const file = input.files?.[0] ?? null;
        if (!file) {
          finish(null);
          return;
        }
        let previewUrl = URL.createObjectURL(file);
        let uploadFile = file;
        const nameExtension = file.name?.split(".").pop();
        const rawFormat = file.type?.split("/")[1] ?? nameExtension ?? "jpeg";
        let format = rawFormat.toLowerCase();

        if (isHeicFile(file)) {
          const converted = await convertHeicToJpeg(file);
          if (converted) {
            URL.revokeObjectURL(previewUrl);
            uploadFile = converted;
            previewUrl = URL.createObjectURL(converted);
            format = "jpeg";
          }
        }
        finish({
          uri: previewUrl,
          width: 0,
          height: 0,
          format,
          file: uploadFile
        });
      };

      window.addEventListener(
        "focus",
        () => {
          setTimeout(() => {
            if (!settled && !(input.files && input.files.length > 0)) {
              finish(null);
            }
          }, 350);
        },
        { once: true }
      );

      document.body.appendChild(input);
      input.click();
    });
  };

  const queueTileUpload = useCallback(
    (index: number, selected: SelectedImage, previousPhotoId: number | null) => {
      const token = `${index}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      uploadTokens.current[index] = token;

      setTiles((prev) => {
        const next = [...prev];
        const previous = next[index];
        if (previous?.uri) {
          revokeObjectUrl(previous.uri);
        }
        next[index] = {
          uri: selected.uri,
          width: selected.width ?? 0,
          height: selected.height ?? 0,
          type: selected.format ?? "jpeg",
          file: selected.file ?? null,
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

          if (!selected.file) {
            throw new Error("missing-file");
          }

          const fileBuffer = await selected.file.arrayBuffer();
          const extensionRaw = selected.file.type?.split("/")[1]?.toLowerCase() ?? "";
          const format = (selected.format ?? extensionRaw ?? "jpg").toLowerCase();
          const extension = format === "jpeg" ? "jpg" : format;
          const key = `${userId}/${Date.now()}_${index + 1}.${extension}`;
          const contentType = selected.file.type || (extension === "jpg" ? "image/jpeg" : "application/octet-stream");
          const supabaseUrl =
            (supabase as any)?.supabaseUrl ??
            process.env.EXPO_PUBLIC_SUPABASE_URL ??
            process.env.EXPO_SUPABASE_URL ??
            "";

          const uploadWithRetry = async (attempt = 0): Promise<void> => {
            try {
              const { error: uploadError } = await supabase.storage
                .from(PROFILE_BUCKET)
                .upload(key, fileBuffer, { contentType, upsert: true });
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
                message.includes("abort") ||
                message.includes("canceled") ||
                message.includes("timeout") ||
                message.includes("network");
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
                message.includes("abort") ||
                message.includes("canceled") ||
                message.includes("timeout") ||
                message.includes("network");
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
          logError(error, "photo-upload");
          Alert.alert(copy.uploadError, getErrorMessage(error, errorCopy, copy.uploadError));
        }
      };

      runUpload();
    },
    [copy.sessionExpiredMessage, copy.uploadError, ensureUserId, errorCopy, navigation, supabase]
  );

  const pickImage = async (index: number) => {
    try {
      const selected = await pickImageWeb();
      if (!selected) {
        return;
      }
      const previousPhotoId = tiles[index]?.photoId ?? null;
      queueTileUpload(index, selected, previousPhotoId);
    } catch (error) {
      console.error("[Photos] picker error", error);
      Alert.alert(copy.uploadError);
    }
  };

  const showSourcePicker = (index: number) => {
    void pickImage(index);
  };

  const startLongPress = (index: number) => {
    longPressFired.current[index] = false;
    if (longPressTimers.current[index]) {
      clearTimeout(longPressTimers.current[index] as ReturnType<typeof setTimeout>);
    }
    longPressTimers.current[index] = setTimeout(() => {
      longPressFired.current[index] = true;
      longPressTimers.current[index] = null;
      removeTile(index);
      setTimeout(() => {
        longPressFired.current[index] = false;
      }, 800);
    }, 600);
  };

  const endLongPress = (index: number) => {
    if (longPressTimers.current[index]) {
      clearTimeout(longPressTimers.current[index] as ReturnType<typeof setTimeout>);
      longPressTimers.current[index] = null;
    }
  };

  const handleTilePress = (index: number) => {
    if (longPressFired.current[index]) {
      longPressFired.current[index] = false;
      return;
    }
    showSourcePicker(index);
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
            const previous = next[index];
            if (previous?.uri) {
              revokeObjectUrl(previous.uri);
            }
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
      logError(error, "finalize-upload");
      Alert.alert(copy.uploadError, getErrorMessage(error, errorCopy, copy.uploadError));
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
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
            <Text style={styles.instructions}>{copy.instructions}</Text>

          <View style={styles.tilesRow}>
            {tiles.map((tile, index) => (
              <View key={index.toString()} style={styles.tileWrapper}>
                <Pressable
                  onPress={() => handleTilePress(index)}
                  onPressIn={() => {
                    if (tile) {
                      startLongPress(index);
                    }
                  }}
                  onPressOut={() => endLongPress(index)}
                  style={({ pressed }) => [
                    styles.tile,
                    pressed && styles.tilePressed,
                    index === 0 && styles.primaryTile
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={index === 0 ? `${copy.profileLabel}` : `${copy.title} ${index + 1}`}
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
              {copy.guidelines.map((item) => (
                <View key={item} style={styles.guidelineRow}>
                  <Ionicons name="checkmark-circle" size={18} color={PALETTE.gold} />
                  <Text style={styles.guidelineText}>{item}</Text>
                </View>
              ))}
              <Pressable onPress={() => setShowRules(true)}>
                <Text style={styles.guidelineLink}>{copy.rulesLink}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

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
            {loading ? (
              <View style={styles.primaryInner}>
                <ActivityIndicator color="#ffffff" />
              </View>
            ) : (
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                <Text style={styles.primaryButtonText}>{copy.continue}</Text>
              </LinearGradient>
            )}
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
    backgroundColor: "transparent"
  },
  scrollContent: {
    paddingBottom: 28
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
    width: "100%",
    height: "100%",
    backgroundColor: PALETTE.gold,
    borderRadius: 999
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: PALETTE.sand,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(242,231,215,0.86)",
    textAlign: "center",
    marginTop: 8
  },
  instructions: {
    textAlign: "center",
    color: "rgba(242,231,215,0.72)",
    marginTop: 10
  },
  tilesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
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
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(217,192,143,0.5)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden"
  },
  tilePressed: {
    borderColor: PALETTE.gold,
    backgroundColor: "rgba(217,192,143,0.08)"
  },
  primaryTile: {
    borderColor: PALETTE.gold,
    shadowColor: PALETTE.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6
  },
  plus: {
    fontSize: 40,
    color: "rgba(242,231,215,0.78)"
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
    color: "#f8d7da",
    textAlign: "center",
    marginTop: 6
  },
  profileLabelChip: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(217,192,143,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.5)"
  },
  profileLabelText: {
    color: PALETTE.gold,
    fontWeight: "700",
    fontSize: 12
  },
  guidelinesBox: {
    marginTop: 28,
    borderRadius: 16,
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: "rgba(217,192,143,0.45)",
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  guidelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  guidelineText: {
    color: "rgba(242,231,215,0.9)",
    fontSize: 14
  },
  guidelineLink: {
    color: PALETTE.gold,
    fontWeight: "600",
    marginTop: 6
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 0,
    marginTop: 20
  },
  primaryButton: {
    borderRadius: 28,
    overflow: "hidden"
  },
  primaryButtonDisabled: {
    opacity: 0.5
  },
  primaryButtonPressed: {
    opacity: 0.85
  },
  primaryInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryButtonText: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontSize: 16
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#f8f7f2"
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0ded8"
  },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2933"
  },
  modalScroll: {
    flex: 1
  },
  modalContent: {
    padding: 20
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#1f2933"
  }
});

export default OnboardingPhotosScreen;
