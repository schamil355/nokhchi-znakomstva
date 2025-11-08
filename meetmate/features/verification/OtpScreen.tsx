import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import UploadProgressModal from "./components/UploadProgressModal";
import { useVerificationFlow } from "./hooks";
import { isCooldownActive } from "./store";
import { useTranslation } from "../../lib/i18n";

const OtpScreen = () => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const {
    sendOtp,
    verifyOtp,
    status,
    sessionId,
    otpAttempts,
    cooldownUntil,
    isSendingOtp,
    isVerifyingOtp,
    similarity,
  } = useVerificationFlow();

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    sendOtp();
  }, [sessionId, sendOtp]);

  useEffect(() => {
    if (code.length === 6) {
      verifyOtp(code);
    }
  }, [code, verifyOtp]);

  const cooldownActive = isCooldownActive(cooldownUntil);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t("verification.otp.title")}</Text>
        <Text style={styles.subtitle}>{t("verification.otp.description")}</Text>

        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          placeholder="••••••"
          autoFocus
          textContentType="oneTimeCode"
        />
        <Text style={styles.attempts}>
          {t("verification.otp.attempts", { count: otpAttempts, total: 3 })}
        </Text>

        <Button
          title={t("verification.otp.resend")}
          onPress={sendOtp}
          disabled={isSendingOtp || cooldownActive}
          loading={isSendingOtp}
          variant="secondary"
        />
        {cooldownActive ? (
          <Text style={styles.cooldown}>{t("verification.errors.rateLimited")}</Text>
        ) : null}

        {status === "completed" ? (
          <Text style={styles.success}>{t("verification.success")}</Text>
        ) : null}
        {status === "selfie_ok" ? (
          <Text style={styles.progress}>{t("verification.otp.waiting")}</Text>
        ) : null}
        {similarity ? (
          <Text style={styles.note}>{t("verification.otp.noScore")}</Text>
        ) : null}
      </View>
      <UploadProgressModal visible={isVerifyingOtp} step="otp" />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 15,
    color: "#334155",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 20,
    letterSpacing: 14,
    textAlign: "center",
  },
  attempts: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 12,
  },
  cooldown: {
    color: "#b91c1c",
    fontSize: 13,
    textAlign: "center",
  },
  success: {
    color: "#047857",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },
  progress: {
    color: "#2563eb",
    textAlign: "center",
  },
  note: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
  },
});

export default OtpScreen;
