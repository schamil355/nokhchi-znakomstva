import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert as RNAlert
} from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { requestPhoneOtp } from "../services/authService";
import { normalizePhone } from "../lib/phone";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";

type Props = NativeStackScreenProps<any>;

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const translations = {
  de: {
    title: "Registrieren",
    phonePlaceholder: "Telefonnummer",
    consentText: "Mit dem Häkchen stimmst du unseren",
    consentSuffix: " zu.",
    terms: "Bedingungen",
    conditions: "Datenschutz",
    and: "und",
    loading: "Lädt...",
    next: "SMS-Code senden",
    member: "Schon Mitglied?",
    login: "Einloggen",
    hintMissingPhone: "Bitte Telefonnummer eingeben.",
    signupFailed: "Registrierung fehlgeschlagen",
    tryAgain: "Bitte versuche es erneut.",
    phoneFormatTitle: "Format",
    phoneFormatMessage: "Bitte gib die Telefonnummer im internationalen Format (z. B. +49123...) ein.",
    otpTitle: "SMS-Code eingeben",
    otpSubtitle: "Wir haben dir einen Bestätigungscode gesendet.",
    otpPlaceholder: "123456",
    otpSubmit: "Bestätigen",
    otpInvalidTitle: "Code ungültig",
    otpInvalidBody: "Bitte erneut versuchen."
  },
  en: {
    title: "Create account",
    phonePlaceholder: "Phone number",
    consentText: "By checking the box you agree to our",
    consentSuffix: ".",
    terms: "Terms",
    conditions: "Conditions",
    and: "and",
    loading: "Loading...",
    next: "Send SMS code",
    member: "Already a member?",
    login: "Log In",
    hintMissingPhone: "Please enter your phone number.",
    signupFailed: "Registration failed",
    tryAgain: "Please try again.",
    phoneFormatTitle: "Format",
    phoneFormatMessage: "Please enter the phone number in international format (e.g. +49123...).",
    otpTitle: "Enter SMS code",
    otpSubtitle: "We sent you a verification code.",
    otpPlaceholder: "123456",
    otpSubmit: "Confirm",
    otpInvalidTitle: "Invalid code",
    otpInvalidBody: "Please try again."
  },
  fr: {
    title: "Créer un compte",
    phonePlaceholder: "Numéro de téléphone",
    consentText: "En cochant la case, tu acceptes nos",
    consentSuffix: ".",
    terms: "Conditions",
    conditions: "Confidentialité",
    and: "et",
    loading: "Chargement...",
    next: "Envoyer le code SMS",
    member: "Déjà membre ?",
    login: "Connexion",
    hintMissingPhone: "Merci de saisir ton numéro de téléphone.",
    signupFailed: "Échec de l'inscription",
    tryAgain: "Réessaie.",
    phoneFormatTitle: "Format",
    phoneFormatMessage: "Merci de saisir le numéro au format international (ex. +49123…).",
    otpTitle: "Saisis le code SMS",
    otpSubtitle: "Nous t'avons envoyé un code de vérification.",
    otpPlaceholder: "123456",
    otpSubmit: "Valider",
    otpInvalidTitle: "Code invalide",
    otpInvalidBody: "Merci de réessayer."
  },
  ru: {
    title: "Регистрация",
    phonePlaceholder: "Номер телефона",
    consentText: "Отмечая, вы соглашаетесь с нашими",
    consentSuffix: ".",
    terms: "Условиями",
    conditions: "Политикой",
    and: "и",
    loading: "Загрузка...",
    next: "Отправить SMS-код",
    member: "Уже есть аккаунт?",
    login: "Войти",
    hintMissingPhone: "Введите номер телефона.",
    signupFailed: "Не удалось зарегистрироваться",
    tryAgain: "Попробуйте еще раз.",
    phoneFormatTitle: "Формат",
    phoneFormatMessage: "Введи номер в международном формате (например, +49123...).",
    otpTitle: "Введите SMS-код",
    otpSubtitle: "Мы отправили проверочный код.",
    otpPlaceholder: "123456",
    otpSubmit: "Подтвердить",
    otpInvalidTitle: "Код недействителен",
    otpInvalidBody: "Попробуйте ещё раз."
  }
};

const CreateAccountScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const errorCopy = useErrorCopy();

  const handleNext = async () => {
    if (!consent || loading) return;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      RNAlert.alert(copy.hintMissingPhone);
      return;
    }
    if (!normalizedPhone.startsWith("+")) {
      RNAlert.alert(copy.phoneFormatTitle, copy.phoneFormatMessage);
      return;
    }

    setLoading(true);
    try {
      await requestPhoneOtp(normalizedPhone);
      navigation.navigate("PhoneOtp", { phone: normalizedPhone });
    } catch (err: any) {
      logError(err, "sign-up");
      RNAlert.alert(copy.signupFailed, getErrorMessage(err, errorCopy, copy.tryAgain));
    } finally {
      setLoading(false);
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
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Pressable style={styles.backBtn} onPress={() => navigation.navigate("Welcome")}>
                <Ionicons name="chevron-back" size={20} color={PALETTE.gold} />
              </Pressable>
              <Text style={styles.title}>{copy.title}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.phonePlaceholder}</Text>
              <TextInput
                style={styles.input}
                placeholder={copy.phonePlaceholder}
                placeholderTextColor="rgba(242,231,215,0.65)"
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\s+/g, ""))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.checkboxRow}>
              <Pressable style={[styles.checkbox, consent && styles.checkboxChecked]} onPress={() => setConsent((v) => !v)}>
                {consent && <Ionicons name="checkmark" size={14} color="#fff" />}
              </Pressable>
              <Text style={styles.checkboxText} numberOfLines={2}>
                {copy.consentText}{" "}
                <Text style={styles.link} onPress={() => navigation.navigate("Legal", { screen: "terms" })}>
                  {copy.terms}
                </Text>{" "}
                {copy.and}{" "}
                <Text style={styles.link} onPress={() => navigation.navigate("Legal", { screen: "privacy" })}>
                  {copy.conditions}
                </Text>
                {copy.consentSuffix ?? "."}
              </Text>
            </View>

            <Pressable
              style={[styles.cta, (!consent || loading) && styles.ctaDisabled]}
              onPress={handleNext}
              disabled={!consent || loading}
            >
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaInner}
              >
                <Text style={styles.ctaText}>{loading ? copy.loading : copy.next}</Text>
              </LinearGradient>
            </Pressable>

            <Text style={styles.footer}>
              {copy.member}{" "}
              <Text style={styles.link} onPress={() => navigation.navigate("SignIn")}>
                {copy.login}
              </Text>
            </Text>
          </ScrollView>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  content: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
    justifyContent: "center"
  },
  header: {
    alignItems: "center",
    gap: 8
  },
  backBtn: {
    alignSelf: "flex-start",
    padding: 6
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.sand
  },
  inputGroup: {
    gap: 6
  },
  label: {
    color: PALETTE.sand,
    fontWeight: "600"
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.2,
    borderColor: "rgba(217,192,143,0.5)",
    color: PALETTE.sand,
    fontSize: 16
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 4,
    marginTop: 10
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  checkboxChecked: {
    backgroundColor: PALETTE.gold,
    borderColor: PALETTE.gold
  },
  checkboxText: {
    flex: 1,
    color: PALETTE.sand,
    fontSize: 13,
    lineHeight: 18
  },
  link: {
    color: "#d8c18f",
    fontWeight: "700"
  },
  cta: {
    marginTop: 12,
    backgroundColor: "transparent",
    borderRadius: 24,
    paddingVertical: 0,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden"
  },
  ctaInner: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  ctaDisabled: {
    opacity: 0.6
  },
  footer: {
    textAlign: "center",
    color: PALETTE.sand,
    fontSize: 14,
    marginTop: 12
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalCard: {
    width: "85%",
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

export default CreateAccountScreen;
