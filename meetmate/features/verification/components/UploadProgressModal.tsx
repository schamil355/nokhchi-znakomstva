import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../../../lib/i18n";

export type UploadProgressModalProps = {
  visible: boolean;
  step: "selfie" | "otp";
};

const UploadProgressModal = ({ visible, step }: UploadProgressModalProps) => {
  const { t } = useTranslation();
  if (!visible) {
    return <></>;
  }

  const message =
    step === "selfie"
      ? t("verification.progress.selfie")
      : t("verification.progress.otp");

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 16,
  },
  message: {
    textAlign: "center",
    fontSize: 16,
    color: "#1f2933",
    fontWeight: "600",
  },
});

export default UploadProgressModal;
