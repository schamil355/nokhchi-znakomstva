import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FaceDetector from "expo-face-detector";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { markProfileVerified } from "../lib/verify";
import { ensureFreshSession } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";
import { useOnboardingStore } from "../state/onboardingStore";
import { startVerificationSession, uploadVerificationSelfie } from "../services/verificationApi";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};
const CameraViewComponent = CameraView as unknown as React.ComponentType<any>;

type Props = NativeStackScreenProps<any>;

const translations = {
  en: {
    title: "Selfie Scan",
    instructions: "Center your face • Good lighting • Remove glasses or masks",
    back: "Back",
    capture: "Take selfie",
    verifying: "Verifying...",
    permission: "Camera permission is required to continue.",
    error: "Verification failed. Please try again.",
    mismatch:
      "We couldn't match your selfie to the profile photo. Please try again with good lighting, no filters and a frontal pose.",
    faceHint: "We need exactly one face in the frame.",
    rec: "REC"
  },
  de: {
    title: "Selfie-Scan",
    instructions: "Gesicht mittig halten • Gute Beleuchtung • Brille/Maske abnehmen",
    back: "Zurück",
    capture: "Selfie aufnehmen",
    verifying: "Prüfe...",
    permission: "Kamerazugriff wird benötigt, um fortzufahren.",
    error: "Verifizierung fehlgeschlagen. Bitte versuche es erneut.",
    mismatch:
      "Dein Selfie konnte nicht eindeutig deinem Profilfoto zugeordnet werden. Bitte versuche es erneut bei guter Beleuchtung, ohne Filter und frontal.",
    faceHint: "Es muss genau ein Gesicht im Bild sein.",
    rec: "REC"
  },
  fr: {
    title: "Scan selfie",
    instructions: "Centre ton visage • Bonne lumière • Retire lunettes/masque",
    back: "Retour",
    capture: "Prendre un selfie",
    verifying: "Vérification...",
    permission: "L'accès à la caméra est nécessaire pour continuer.",
    error: "Échec de la vérification. Réessaie.",
    mismatch:
      "Ton selfie n'a pas pu être associé à ta photo de profil. Réessaie avec une bonne lumière, sans filtres et visage de face.",
    faceHint: "Nous avons besoin d'un seul visage à l'écran.",
    rec: "REC"
  },
  ru: {
    title: "Селфи-скан",
    instructions: "Держи лицо по центру • Хорошее освещение • Сними очки/маску",
    back: "Назад",
    capture: "Сделать селфи",
    verifying: "Проверяю...",
    permission: "Нужен доступ к камере, чтобы продолжить.",
    error: "Проверка не удалась. Попробуй ещё раз.",
    mismatch: "Не удалось сопоставить селфи. Попробуй ещё раз при хорошем освещении и без фильтров.",
    faceHint: "В кадре должно быть ровно одно лицо.",
    rec: "REC"
  }
};

const SelfieScanScreen = ({ navigation, route }: Props) => {
  const copy = useLocalizedCopy(translations);
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [faces, setFaces] = useState<FaceDetector.FaceFeature[]>([]);
  const [busy, setBusy] = useState(false);
  const profilePath: string | null = route?.params?.profilePath ?? null;
  const setSession = useAuthStore((state) => state.setSession);
  const setShowVerifySuccess = useOnboardingStore((state) => state.setShowVerifySuccess);
  const [verificationSessionId, setVerificationSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!profilePath) {
      navigation.replace("OnboardingPhotos");
      return;
    }
    if (!cameraPermission) {
      requestPermission();
    } else if (!cameraPermission.granted) {
      requestPermission();
    }
  }, [cameraPermission, navigation, profilePath, requestPermission]);

  const onFacesDetected = useCallback(({ faces: detectedFaces }: { faces: FaceDetector.FaceFeature[] }) => {
    setFaces(detectedFaces);
  }, []);

  const handleCapture = async () => {
    if (busy) {
      return;
    }
    if (!cameraRef.current) {
      return;
    }
    if (!profilePath) {
      Alert.alert(copy.error);
      navigation.replace("OnboardingPhotos");
      return;
    }
    // Face detection is flaky on some devices – continue even if detector fails.
    setBusy(true);
    try {
      const { session } = await ensureFreshSession();
      if (!session?.user?.id) {
        navigation.replace("SignIn");
        return;
      }
      const currentSessionId =
        verificationSessionId ??
        (await startVerificationSession().then((res) => {
          setVerificationSessionId(res.sessionId);
          return res.sessionId;
        }));
      const photo = await cameraRef.current.takePictureAsync({
        skipProcessing: true,
        quality: 0.8
      });
      const result = await uploadVerificationSelfie({
        sessionId: currentSessionId,
        fileUri: photo.uri,
        mimeType: "image/jpeg",
        captureFlag: true
      });

      if (result?.ok) {
        await markProfileVerified(result?.similarity ?? null);
        if (session) {
          setSession(session);
        }
        setShowVerifySuccess(true);
        navigation.replace("OnboardingVerifySuccess");
      } else {
        Alert.alert(copy.mismatch);
      }
    } catch (error) {
      console.error("[SelfieScan]", error);
      Alert.alert(copy.error);
    } finally {
      setBusy(false);
    }
  };

  if (!cameraPermission?.granted) {
    return (
      <LinearGradient
        colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
          <View style={[styles.container, styles.permissionState]}>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel={copy.back}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            >
              <Ionicons name="chevron-back" size={24} color={PALETTE.gold} />
            </Pressable>
            <Ionicons name="camera-outline" size={56} color={PALETTE.gold} />
            <Text style={[styles.title, styles.titleCentered]}>{copy.title}</Text>
            <Text style={[styles.subtitle, styles.subtitleCentered]}>{copy.permission}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed
              ]}
              onPress={requestPermission}
            >
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryInner}
              >
                <Text style={styles.primaryButtonText}>{copy.capture}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Allow capture as long as there aren't multiple faces (detector can miss a single face on some devices).
  const hasMultipleFaces = faces.length > 1;
  const canCapture = !busy && !hasMultipleFaces;

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
          <Text style={styles.subtitle}>{copy.instructions}</Text>
          {hasMultipleFaces && <Text style={styles.faceHint}>{copy.faceHint}</Text>}

          <View style={styles.cameraCard}>
            <View style={styles.panelHeader}>
              <View style={styles.recBadge}>
                <View style={styles.recDot} />
                <Text style={styles.recText}>{copy.rec}</Text>
              </View>
              <Pressable
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel={copy.back}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={PALETTE.sand} />
              </Pressable>
            </View>
            <View style={styles.ovalWrapper}>
              <CameraViewComponent
                ref={(ref: CameraView | null) => {
                  cameraRef.current = ref;
                }}
                style={styles.camera}
                facing="front"
                onFacesDetected={onFacesDetected}
                faceDetectorSettings={{
                  mode: FaceDetector.FaceDetectorMode.fast,
                  detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
                  runClassifications: FaceDetector.FaceDetectorClassifications.none,
                  minDetectionInterval: 300,
                  tracking: true,
                  trackingId: true
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleCapture}
            disabled={!canCapture}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canCapture }}
            style={({ pressed }) => [
              styles.primaryButton,
              (!canCapture || busy) && styles.primaryButtonDisabled,
              pressed && canCapture && !busy && styles.primaryButtonPressed
            ]}
          >
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryInner}
            >
              <Text style={styles.primaryButtonText}>{busy ? copy.verifying : copy.capture}</Text>
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
    paddingTop: 4,
    backgroundColor: "transparent"
  },
  permissionState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 18
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
    width: "100%",
    height: "100%",
    backgroundColor: PALETTE.gold,
    borderRadius: 999
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.sand,
    textAlign: "left"
  },
  titleCentered: {
    textAlign: "center"
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(242,231,215,0.82)",
    textAlign: "left",
    marginTop: 6
  },
  subtitleCentered: {
    textAlign: "center"
  },
  faceHint: {
    marginTop: 10,
    color: "#f8d7da",
    textAlign: "left"
  },
  cameraCard: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.3)",
    width: "100%"
  },
  panelHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(217,192,143,0.14)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ff4d4f"
  },
  recText: {
    color: PALETTE.sand,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.6)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  ovalWrapper: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.25)"
  },
  camera: {
    width: "100%",
    height: "100%"
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
  primaryButtonDisabled: {
    opacity: 0.65
  },
  primaryButtonPressed: {
    opacity: 0.9
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

export default SelfieScanScreen;
