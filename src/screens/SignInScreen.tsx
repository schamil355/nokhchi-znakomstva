import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { signInWithPassword } from "../services/authService";
import { useAuthStore } from "../state/authStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

type Props = NativeStackScreenProps<any>;

const translations = {
  de: {
    title: "Anmelden",
    emailLabel: "E-Mail",
    emailPlaceholder: "Gib deine E-Mail-Adresse ein",
    passwordLabel: "Passwort",
    passwordPlaceholder: "Gib das Passwort ein",
    forgot: "Passwort vergessen?",
    submit: "Weiter",
    loading: "Lädt...",
    signupHint: "Neu hier?",
    signupLink: "Jetzt registrieren",
    resetTitle: "Passwort zurücksetzen",
    resetInfo: "Wir senden dir einen Link zum Zurücksetzen.",
    resetPlaceholder: "E-Mail-Adresse",
    resetSend: "Link senden",
    resetSuccess: "Bitte prüfe dein Postfach.",
    resetMissingEmail: "Bitte gib deine E-Mail ein.",
    resetError: "Passwort konnte nicht zurückgesetzt werden.",
    close: "Schließen",
    signInFailedTitle: "Anmeldung fehlgeschlagen",
    signInFailedMessage: "Bitte prüfe deine Angaben."
  },
  en: {
    title: "Sign in",
    emailLabel: "Email",
    emailPlaceholder: "Enter your email address",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    forgot: "Forgot password?",
    submit: "Next",
    loading: "Loading...",
    signupHint: "New here?",
    signupLink: "Create an account",
    resetTitle: "Reset password",
    resetInfo: "We'll send you a reset link.",
    resetPlaceholder: "Email address",
    resetSend: "Send link",
    resetSuccess: "Please check your inbox.",
    resetMissingEmail: "Please enter your email.",
    resetError: "Could not reset the password.",
    close: "Close",
    signInFailedTitle: "Sign in failed",
    signInFailedMessage: "Please check your details."
  },
  fr: {
    title: "Connexion",
    emailLabel: "E-mail",
    emailPlaceholder: "Saisis ton e-mail",
    passwordLabel: "Mot de passe",
    passwordPlaceholder: "Saisis ton mot de passe",
    forgot: "Mot de passe oublié ?",
    submit: "Continuer",
    loading: "Chargement...",
    signupHint: "Nouveau ici ?",
    signupLink: "Créer un compte",
    resetTitle: "Réinitialiser le mot de passe",
    resetInfo: "Nous envoyons un lien pour réinitialiser.",
    resetPlaceholder: "Adresse e-mail",
    resetSend: "Envoyer",
    resetSuccess: "Vérifie ta boîte mail.",
    resetMissingEmail: "Merci d'entrer ton e-mail.",
    resetError: "Impossible de réinitialiser le mot de passe.",
    close: "Fermer",
    signInFailedTitle: "Échec de la connexion",
    signInFailedMessage: "Merci de vérifier tes informations."
  },
  ru: {
    title: "Войти",
    emailLabel: "E-mail",
    emailPlaceholder: "Введите e-mail",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Введите пароль",
    forgot: "Забыли пароль?",
    submit: "Далее",
    loading: "Загрузка...",
    signupHint: "Еще нет аккаунта?",
    signupLink: "Зарегистрироваться",
    resetTitle: "Сброс пароля",
    resetInfo: "Мы отправим ссылку для сброса пароля.",
    resetPlaceholder: "E-mail",
    resetSend: "Отправить",
    resetSuccess: "Проверьте почту.",
    resetMissingEmail: "Введите e-mail.",
    resetError: "Не удалось сбросить пароль.",
    close: "Закрыть",
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setLoadingState = useAuthStore((state) => state.setLoading);
  const copy = useLocalizedCopy(translations);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setLoadingState(true);

    try {
      await signInWithPassword(email.trim().toLowerCase(), password);
    } catch (error: any) {
      Alert.alert(copy.signInFailedTitle, error.message ?? copy.signInFailedMessage);
    } finally {
      setLoading(false);
      setLoadingState(false);
    }
  };

  const handlePasswordReset = async () => {
    const targetEmail = (resetEmail || email).trim().toLowerCase();
    if (!targetEmail) {
      Alert.alert(copy.resetTitle, copy.resetMissingEmail);
      return;
    }
    setResetLoading(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: "https://tschetschenische.app/auth/reset"
      });
      Alert.alert(copy.resetTitle, copy.resetSuccess);
      setResetVisible(false);
    } catch (error: any) {
      Alert.alert(copy.resetTitle, error.message ?? copy.resetError);
    } finally {
      setResetLoading(false);
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
              <Text style={styles.label}>{copy.emailLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={copy.emailPlaceholder}
                placeholderTextColor="rgba(242,231,215,0.65)"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              <View style={styles.passwordRow}>
                <Text style={styles.label}>{copy.passwordLabel}</Text>
                <Pressable onPress={() => { setResetEmail(email); setResetVisible(true); }}>
                  <Text style={styles.forgotText}>{copy.forgot}</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.input}
                placeholder={copy.passwordPlaceholder}
                placeholderTextColor="rgba(242,231,215,0.65)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={[PALETTE.gold, "#8b6c2a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonInner}
                >
                  <Text style={styles.buttonText}>{loading ? copy.loading : copy.submit}</Text>
                </LinearGradient>
              </Pressable>
            </View>
            <Pressable onPress={() => navigation.navigate("CreateAccount", { mode: "email" })}>
              <Text style={styles.signupHint}>
                {copy.signupHint} <Text style={styles.signupLink}>{copy.signupLink}</Text>
              </Text>
            </Pressable>
          </View>

          {resetVisible && (
            <KeyboardAvoidingView
              behavior={Platform.select({ ios: "padding", android: undefined })}
              keyboardVerticalOffset={Platform.select({ ios: 100, default: 0 })}
              style={styles.resetBackdrop}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setResetVisible(false)} />
              <View style={styles.resetCard}>
                <Text style={styles.resetTitle}>{copy.resetTitle}</Text>
                <Text style={styles.resetInfo}>{copy.resetInfo}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={copy.resetPlaceholder}
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />
                <Pressable
                  style={[styles.button, resetLoading && styles.buttonDisabled]}
                  onPress={handlePasswordReset}
                  disabled={resetLoading}
                >
                  <LinearGradient
                    colors={[PALETTE.gold, "#8b6c2a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonInner}
                  >
                    <Text style={styles.buttonText}>{resetLoading ? copy.loading : copy.resetSend}</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable onPress={() => setResetVisible(false)}>
                  <Text style={styles.resetCancel}>{copy.close}</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
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
  emailTab: {
    height: 0
  },
  emailTabText: {
    height: 0
  },
  form: {
    gap: 12,
    marginTop: 12
  },
  label: {
    color: PALETTE.sand,
    fontWeight: "600"
  },
  passwordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  forgotText: {
    color: "#d8c18f",
    fontWeight: "500"
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
  resetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    paddingTop: Platform.select({ ios: 20, default: 40 })
  },
  resetCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    gap: 12
  },
  resetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0d1f1a"
  },
  resetInfo: {
    color: "#5a625e"
  },
  resetCancel: {
    textAlign: "center",
    marginTop: 8,
    color: "#0d6e4f",
    fontWeight: "600"
  }
});

export default SignInScreen;
