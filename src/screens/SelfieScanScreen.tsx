import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FaceDetector from "expo-face-detector";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { markProfileVerified } from "../lib/verify";
import { ensureFreshSession } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";
import { useOnboardingStore } from "../state/onboardingStore";
import { startVerificationSession, uploadVerificationSelfie } from "../services/verificationApi";

const ACCENT_COLOR = "#0d6e4f";
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color={ACCENT_COLOR} />
          <Text style={styles.permissionText}>{copy.permission}</Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{copy.capture}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Allow capture as long as there aren't multiple faces (detector can miss a single face on some devices).
  const hasMultipleFaces = faces.length > 1;
  const canCapture = !busy && !hasMultipleFaces;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={copy.back}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="chevron-back" size={24} color="#05060a" />
        </Pressable>
      </View>
      <View style={styles.content}>
        <View style={styles.cameraPanel}>
          <View style={styles.panelHeader}>
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>{copy.rec}</Text>
            </View>
            <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={copy.back} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#ffffff" />
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
        <Pressable
          onPress={handleCapture}
          disabled={!canCapture}
          style={[styles.captureButton, !canCapture && styles.captureButtonDisabled]}
        >
          <Text style={styles.captureButtonText}>{busy ? copy.verifying : copy.capture}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff"
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#fff"
  },
  permissionText: {
    textAlign: "center",
    color: "#333",
    paddingHorizontal: 32
  },
  permissionButton: {
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  permissionButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  backButtonPressed: {
    opacity: 0.7
  },
  headerTitle: {
    color: "#05060a",
    fontSize: 18,
    fontWeight: "600"
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    backgroundColor: "#ffffff"
  },
  cameraPanel: {
    backgroundColor: "#ffffff",
    borderRadius: 32,
    padding: 16,
    alignItems: "center"
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
    backgroundColor: "#101833",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999
  },
  recDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff3b30"
  },
  recText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#030714"
  },
  ovalWrapper: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 200,
    overflow: "hidden",
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center"
  },
  camera: {
    width: "100%",
    height: "100%"
  },
  faceHint: {
    marginTop: 14,
    marginBottom: 4,
    color: "#b42318",
    textAlign: "center"
  },
  captureButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  captureButtonDisabled: {
    backgroundColor: "#5a5a5a"
  },
  captureButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
});

export default SelfieScanScreen;
