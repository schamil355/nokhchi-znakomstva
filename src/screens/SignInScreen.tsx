import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import SafeAreaView from "../components/SafeAreaView";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { requestPhoneOtp, verifyPhoneOtp } from "../services/authService";
import { useAuthStore } from "../state/authStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { normalizePhone } from "../lib/phone";

type Props = NativeStackScreenProps<any>;

const translations = {
  de: {
    title: "Anmelden",
    phoneLabel: "Telefonnummer",
    phonePlaceholder: "Gib deine Telefonnummer ein",
    submit: "SMS-Code senden",
    loading: "Lädt...",
    missingPhone: "Bitte gib deine Telefonnummer ein.",
    phoneFormatTitle: "Format",
    phoneFormatMessage: "Bitte gib die Telefonnummer im internationalen Format (z. B. +49123...) ein.",
    signupHint: "Neu hier?",
    signupLink: "Jetzt registrieren",
    otpTitle: "SMS-Code eingeben",
    otpSubtitle: "Wir haben dir einen Bestätigungscode gesendet.",
    otpPlaceholder: "123456",
    otpSubmit: "Bestätigen",
    otpInvalidTitle: "Code ungültig",
    otpInvalidBody: "Bitte erneut versuchen.",
    signInFailedTitle: "Anmeldung fehlgeschlagen",
    signInFailedMessage: "Bitte prüfe deine Angaben."
  },
  en: {
    title: "Sign in",
    phoneLabel: "Phone number",
    phonePlaceholder: "Enter your phone number",
    submit: "Send SMS code",
    loading: "Loading...",
    missingPhone: "Please enter your phone number.",
    phoneFormatTitle: "Format",
    phoneFormatMessage: "Please enter the phone number in international format (e.g. +49123...).",
    signupHint: "New here?",
    signupLink: "Create an account",
    otpTitle: "Enter SMS code",
    otpSubtitle: "We sent you a verification code.",
    otpPlaceholder: "123456",
    otpSubmit: "Confirm",
    otpInvalidTitle: "Invalid code",
    otpInvalidBody: "Please try again.",
    signInFailedTitle: "Sign in failed",
    signInFailedMessage: "Please check your details."
  },
  fr: {
    title: "Connexion",
    phoneLabel: "Téléphone",
    phonePlaceholder: "Saisis ton numéro",
    submit: "Envoyer le code SMS",
    loading: "Chargement...",
    missingPhone: "Merci d'entrer ton numéro.",
    phoneFormatTitle: "Format",
    phoneFormatMessage: "Merci de saisir le numéro au format international (ex. +49123…).",
    signupHint: "Nouveau ici ?",
    signupLink: "Créer un compte",
    otpTitle: "Saisis le code SMS",
    otpSubtitle: "Nous t'avons envoyé un code de vérification.",
    otpPlaceholder: "123456",
    otpSubmit: "Valider",
    otpInvalidTitle: "Code invalide",
    otpInvalidBody: "Merci de réessayer.",
    signInFailedTitle: "Échec de la connexion",
    signInFailedMessage: "Merci de vérifier tes informations."
  },
  ru: {
    title: "Войти",
    phoneLabel: "Телефон",
    phonePlaceholder: "Введите номер телефона",
    submit: "Отправить SMS-код",
    loading: "Загрузка...",
    missingPhone: "Введите номер телефона.",
    phoneFormatTitle: "Формат",
    phoneFormatMessage: "Введите номер в международном формате (например, +49123...).",
    signupHint: "Еще нет аккаунта?",
    signupLink: "Зарегистрироваться",
    otpTitle: "Введите SMS-код",
    otpSubtitle: "Мы отправили проверочный код.",
    otpPlaceholder: "123456",
    otpSubmit: "Подтвердить",
    otpInvalidTitle: "Код недействителен",
    otpInvalidBody: "Попробуйте ещё раз.",
    signInFailedTitle: "Не удалось войти",
    signInFailedMessage: "Проверьте введённые данные."
  }
};

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const SignInScreen = ({ navigation }: Props) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const setLoadingState = useAuthStore((state) => state.setLoading);
  const copy = useLocalizedCopy(translations);
  const errorCopy = useErrorCopy();

  const handleSubmit = async () => {
    if (sending) {
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      Alert.alert(copy.missingPhone);
      return;
    }
    if (!normalizedPhone.startsWith("+")) {
      Alert.alert(copy.phoneFormatTitle, copy.phoneFormatMessage);
      return;
    }

    setSending(true);

    try {
      await requestPhoneOtp(normalizedPhone);
      setOtpPhone(normalizedPhone);
      setShowOtpModal(true);
    } catch (error: any) {
      logError(error, "sign-in-otp-request");
      Alert.alert(copy.signInFailedTitle, getErrorMessage(error, errorCopy, copy.signInFailedMessage));
    } finally {
      setSending(false);
    }
  };

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={styles.container}
        >
          <View style={styles.darkLayout}>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={22} color={PALETTE.gold} />
            </Pressable>
            <Text style={styles.title}>{copy.title}</Text>
            <View style={styles.form}>
              <Text style={styles.label}>{copy.phoneLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={copy.phonePlaceholder}
                placeholderTextColor="rgba(242,231,215,0.65)"
                autoCapitalize="none"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <Pressable
                style={[styles.button, sending && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={sending}
              >
                <LinearGradient
                  colors={[PALETTE.gold, "#8b6c2a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonInner}
                >
                  <Text style={styles.buttonText}>{sending ? copy.loading : copy.submit}</Text>
                </LinearGradient>
              </Pressable>
            </View>
            <Pressable onPress={() => navigation.navigate("CreateAccount", { mode: "phone" })}>
              <Text style={styles.signupHint}>
                {copy.signupHint} <Text style={styles.signupLink}>{copy.signupLink}</Text>
              </Text>
            </Pressable>
          </View>

          {showOtpModal && (
            <Pressable style={styles.modalBackdrop} onPress={() => setShowOtpModal(false)}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{copy.otpTitle}</Text>
                <Text style={styles.modalSubtitle}>{copy.otpSubtitle}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={copy.otpPlaceholder}
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Pressable
                  style={[styles.button, (otp.length < 4 || verifying) && styles.buttonDisabled]}
                  onPress={async () => {
                    if (otp.length < 4 || verifying) return;
                    setVerifying(true);
                    setLoadingState(true);
                    try {
                      const { profile } = await verifyPhoneOtp(normalizePhone(otpPhone || phone), otp);
                      setShowOtpModal(false);
                      setOtp("");
                      if (!profile || !profile.verified) {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: "OnboardingGender" }]
                        });
                      }
                    } catch (verifyError: any) {
                      logError(verifyError, "sign-in-otp-verify");
                      Alert.alert(copy.otpInvalidTitle, getErrorMessage(verifyError, errorCopy, copy.otpInvalidBody));
                    } finally {
                      setVerifying(false);
                      setLoadingState(false);
                    }
                  }}
                  disabled={otp.length < 4 || verifying}
                >
                  <LinearGradient
                    colors={[PALETTE.gold, "#8b6c2a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonInner}
                  >
                    <Text style={styles.buttonText}>{verifying ? copy.loading : copy.otpSubmit}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </Pressable>
          )}
        </KeyboardAvoidingView>
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
    justifyContent: "center",
    paddingHorizontal: 24
  },
  darkLayout: {
    gap: 16
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 6
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.sand,
    textAlign: "center",
    marginBottom: 8
  },
  form: {
    gap: 12,
    marginTop: 12
  },
  label: {
    color: PALETTE.sand,
    fontWeight: "600"
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.5)",
    color: PALETTE.sand,
    fontSize: 16
  },
  button: {
    backgroundColor: "transparent",
    borderRadius: 24,
    marginTop: 4,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden"
  },
  buttonInner: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16
  },
  signupHint: {
    color: PALETTE.sand,
    textAlign: "center",
    marginTop: 16
  },
  signupLink: {
    color: "#d8c18f",
    fontWeight: "700"
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center"
  },
  modalSubtitle: {
    color: "#777",
    textAlign: "center"
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    textAlign: "center"
  }
});

export default SignInScreen;
