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
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";
import { getEmailRedirectUrl } from "../services/authService";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorDetails, getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";

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
    emailPlaceholder: "E-Mail-Adresse",
    passwordPlaceholder: "Passwort",
    consentText: "Mit dem Häkchen stimmst du unseren",
    consentSuffix: " zu.",
    terms: "Bedingungen",
    conditions: "Datenschutz",
    and: "und",
    loading: "Lädt...",
    next: "Weiter",
    member: "Schon Mitglied?",
    login: "Einloggen",
    hintMissingEmail: "Bitte E-Mail und Passwort eingeben.",
    signupFailed: "Registrierung fehlgeschlagen",
    tryAgain: "Bitte versuche es erneut."
  },
  en: {
    title: "Create account",
    emailPlaceholder: "Email address",
    passwordPlaceholder: "Password",
    consentText: "By checking the box you agree to our",
    consentSuffix: ".",
    terms: "Terms",
    conditions: "Conditions",
    and: "and",
    loading: "Loading...",
    next: "Next",
    member: "Already a member?",
    login: "Log In",
    hintMissingEmail: "Please enter your email and password.",
    signupFailed: "Registration failed",
    tryAgain: "Please try again."
  },
  fr: {
    title: "Créer un compte",
    emailPlaceholder: "Adresse e-mail",
    passwordPlaceholder: "Mot de passe",
    consentText: "En cochant la case, tu acceptes nos",
    consentSuffix: ".",
    terms: "Conditions",
    conditions: "Confidentialité",
    and: "et",
    loading: "Chargement...",
    next: "Suivant",
    member: "Déjà membre ?",
    login: "Connexion",
    hintMissingEmail: "Merci de saisir email et mot de passe.",
    signupFailed: "Échec de l'inscription",
    tryAgain: "Réessaie."
  },
  ru: {
    title: "Регистрация",
    emailPlaceholder: "E-mail",
    passwordPlaceholder: "Пароль",
    consentText: "Отмечая, вы соглашаетесь с нашими",
    consentSuffix: ".",
    terms: "Условиями",
    conditions: "Политикой",
    and: "и",
    loading: "Загрузка...",
    next: "Далее",
    member: "Уже есть аккаунт?",
    login: "Войти",
    hintMissingEmail: "Введите e-mail и пароль.",
    signupFailed: "Не удалось зарегистрироваться",
    tryAgain: "Попробуйте еще раз."
  }
};

const CreateAccountScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const errorCopy = useErrorCopy();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const setSession = useAuthStore((state) => state.setSession);

  const showError = (title: string, message: string) => {
    if (Platform.OS === "web") {
      setSubmitError(message);
      return;
    }
    RNAlert.alert(title, message);
  };

  const handleNext = async () => {
    if (!consent || loading) return;
    setSubmitError(null);

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !password) {
      showError(copy.signupFailed, copy.hintMissingEmail);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email: emailTrimmed,
        password,
        options: { emailRedirectTo: getEmailRedirectUrl() }
      });
      if (error) {
        throw error;
      }
      if (data.session) {
        setSession(data.session);
        navigation.navigate("OnboardingGender");
        return;
      }
      if (data.user?.email) {
        navigation.navigate("EmailPending", { email: data.user.email });
        return;
      }
      showError(copy.signupFailed, copy.tryAgain);
    } catch (err: any) {
      logError(err, "sign-up");
      const baseMessage = getErrorMessage(err, errorCopy, copy.tryAgain);
      const detailedMessage = Platform.OS === "web" ? getErrorDetails(err) : null;
      const useDetails =
        Boolean(detailedMessage) &&
        (baseMessage === copy.tryAgain || baseMessage === errorCopy.unknown);
      const message = useDetails ? detailedMessage! : baseMessage;
      showError(copy.signupFailed, message);
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
              <Text style={styles.label}>{copy.emailPlaceholder}</Text>
              <TextInput
                style={styles.input}
                placeholder={copy.emailPlaceholder}
                placeholderTextColor="rgba(242,231,215,0.65)"
                value={email}
                onChangeText={(value) => {
                  setSubmitError(null);
                  setEmail(value);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{copy.passwordPlaceholder}</Text>
              <TextInput
                style={styles.input}
                placeholder={copy.passwordPlaceholder}
                placeholderTextColor="rgba(242,231,215,0.65)"
                value={password}
                onChangeText={(value) => {
                  setSubmitError(null);
                  setPassword(value);
                }}
                secureTextEntry
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
            {submitError && <Text style={styles.submitError}>{submitError}</Text>}

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
  submitError: {
    color: "#f2b8b5",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8
  },
  footer: {
    textAlign: "center",
    color: PALETTE.sand,
    fontSize: 14,
    marginTop: 12
  }
});

export default CreateAccountScreen;
