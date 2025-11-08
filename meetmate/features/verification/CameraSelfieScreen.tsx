import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Camera, CameraType } from "expo-camera";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useIsFocused, useRouter } from "expo-router";
import Button from "../../components/ui/Button";
import UploadProgressModal from "./components/UploadProgressModal";
import { useVerificationFlow } from "./hooks";
import { isCooldownActive } from "./store";
import { useTranslation } from "../../lib/i18n";

const CameraSelfieScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const isFocused = useIsFocused();
  const cameraRef = useRef<Camera | null>(null);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    submitSelfie,
    isUploading,
    sessionId,
    selfieAttempts,
    cooldownUntil,
    errorMessage,
    reset,
  } = useVerificationFlow();

  usePreventScreenCapture();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/verification/consent");
    }
  }, [sessionId, router]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isUploading || isProcessing) {
      return;
    }
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: Platform.OS === "android",
      });
      if (!photo?.uri) {
        throw new Error("CAPTURE_FAILED");
      }
      await submitSelfie(photo.uri);
    } catch (error: any) {
      const errorCode =
        typeof error?.message === "string" ? error.message : "SELFIE_NOT_MATCHED";
      const messageKey =
        errorCode === "SELFIE_RATE_LIMIT"
          ? "verification.errors.rateLimited"
          : "verification.errors.verificationFailed";
      Alert.alert(t("verification.selfie.retryTitle"), t(messageKey));
    } finally {
      setIsProcessing(false);
    }
  }, [isUploading, isProcessing, submitSelfie, t]);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>{t("verification.selfie.permission")}</Text>
        <Button
          title={t("verification.selfie.enableCamera")}
          onPress={requestPermission}
        />
      </View>
    );
  }

  const cooldownActive = isCooldownActive(cooldownUntil);

  return (
    <View style={styles.container}>
      {isFocused ? (
        <Camera
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          style={styles.camera}
          type={CameraType.front}
          ratio="4:3"
        />
      ) : (
        <View style={[styles.camera, styles.cameraPlaceholder]} />
      )}

      <View style={styles.overlay}>
        <Text style={styles.title}>{t("verification.selfie.title")}</Text>
        <Text style={styles.subtitle}>{t("verification.selfie.instructions")}</Text>
        <View style={styles.hintContainer}>
          <Text style={styles.hint}>{t("verification.selfie.hintMovement")}</Text>
          <Text style={styles.hint}>{t("verification.selfie.hintLight")}</Text>
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {cooldownActive ? (
          <Text style={styles.cooldown}>{t("verification.errors.rateLimited")}</Text>
        ) : null}

        <Button
          title={t("verification.selfie.capture")}
          onPress={handleCapture}
          disabled={!isFocused || isUploading || isProcessing || cooldownActive}
          loading={isUploading || isProcessing}
        />
        <Pressable style={styles.retry} onPress={reset}>
          <Text style={styles.retryText}>{t("verification.selfie.retake")}</Text>
        </Pressable>
        <Text style={styles.attempts}>
          {t("verification.selfie.attempts", { count: selfieAttempts, total: 3 })}
        </Text>
      </View>

      <UploadProgressModal visible={isUploading} step="selfie" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 3,
  },
  cameraPlaceholder: {
    backgroundColor: "#111",
  },
  overlay: {
    flex: 2,
    padding: 24,
    gap: 16,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 16,
    color: "#1e293b",
  },
  hintContainer: {
    gap: 8,
  },
  hint: {
    fontSize: 14,
    color: "#475569",
  },
  error: {
    color: "#b91c1c",
    fontSize: 14,
  },
  cooldown: {
    color: "#b91c1c",
    fontSize: 14,
  },
  retry: {
    alignItems: "center",
  },
  retryText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  attempts: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#1f2933",
  },
});

export default CameraSelfieScreen;
