import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import type { Session } from "@supabase/supabase-js";
import { getEmailRedirectUrl } from "../services/authService";
import { LinearGradient } from "expo-linear-gradient";

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
    title: "E-Mail bestätigen",
    body:
      "Wir haben dir einen Bestätigungslink gesendet. Bitte prüfe dein Postfach und bestätige deine E-Mail. Schau ggf. auch im Spam-Ordner nach.",
    hint: "Nach der Bestätigung leiten wir dich automatisch zum nächsten Schritt.",
    openMail: "Mail-App öffnen",
    resendEmail: "E-Mail erneut senden",
    resendEmailLoading: "Sende…",
    resendEmailSentTitle: "E-Mail gesendet",
    resendEmailSentBody: "Wir haben dir die Bestätigungs-E-Mail erneut geschickt.",
    resendEmailErrorTitle: "Fehler",
    resendEmailErrorBody: "Die E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.",
    resendEmailMissing: "Wir konnten keine E-Mail-Adresse finden.",
    backToRegister: "Zurück zur Registrierung",
    mailAppMissingTitle: "Keine Mail-App gefunden",
    mailAppMissingBody: "Bitte öffne deine Mail-App manuell, um deinen Posteingang zu prüfen."
  },
  en: {
    title: "Confirm your email",
    body:
      "We sent you a verification link. Please check your inbox and confirm your email. If you can't find it, please check your spam folder.",
    hint: "After confirming we will take you to the next step automatically.",
    openMail: "Open mail app",
    resendEmail: "Resend email",
    resendEmailLoading: "Sending…",
    resendEmailSentTitle: "Email sent",
    resendEmailSentBody: "We just sent you another confirmation email.",
    resendEmailErrorTitle: "Error",
    resendEmailErrorBody: "Could not send the email. Please try again later.",
    resendEmailMissing: "No email address found.",
    backToRegister: "Back to registration",
    mailAppMissingTitle: "No mail app found",
    mailAppMissingBody: "Please open your mail app manually to check your inbox."
  },
  fr: {
    title: "Confirme ton e-mail",
    body:
      "Nous t'avons envoyé un lien de vérification. Vérifie ta boîte mail et confirme ton e-mail. Si tu ne le trouves pas, regarde dans ton dossier spam.",
    hint: "Après confirmation, nous t'emmènerons automatiquement à l'étape suivante.",
    openMail: "Ouvrir l'app mail",
    resendEmail: "Renvoyer l'e-mail",
    resendEmailLoading: "Envoi…",
    resendEmailSentTitle: "E-mail envoyé",
    resendEmailSentBody: "Nous venons de renvoyer l'e-mail de confirmation.",
    resendEmailErrorTitle: "Erreur",
    resendEmailErrorBody: "Impossible d'envoyer l'e-mail. Réessaie plus tard.",
    resendEmailMissing: "Aucune adresse e-mail trouvée.",
    backToRegister: "Retour à l'inscription",
    mailAppMissingTitle: "Aucune app mail trouvée",
    mailAppMissingBody: "Merci d’ouvrir ton app mail manuellement pour consulter ta boîte de réception."
  },
  ru: {
    title: "Подтвердите e-mail",
    body:
      "Мы отправили ссылку для подтверждения. Проверьте почту и подтвердите e-mail. Если письма нет, загляните в папку «Спам».",
    hint: "После подтверждения мы переведём вас к следующему шагу.",
    openMail: "Открыть почту",
    resendEmail: "Отправить письмо ещё раз",
    resendEmailLoading: "Отправляем…",
    resendEmailSentTitle: "Письмо отправлено",
    resendEmailSentBody: "Мы снова отправили вам письмо для подтверждения.",
    resendEmailErrorTitle: "Ошибка",
    resendEmailErrorBody: "Не удалось отправить письмо. Повторите попытку позже.",
    resendEmailMissing: "Не найдён адрес электронной почты.",
    backToRegister: "К регистрации",
    mailAppMissingTitle: "Нет почтового приложения",
    mailAppMissingBody: "Откройте почтовое приложение вручную, чтобы проверить входящие."
  }
};

const EmailPendingScreen = ({ navigation, route }: Props) => {
  const copy = useLocalizedCopy(translations);
  const email = route?.params?.email as string | undefined;
  const supabase = getSupabaseClient();
  const setSession = useAuthStore((state) => state.setSession);
  const session = useAuthStore((state) => state.session);
  const nav = useNavigation<any>();
  const startedAtRef = useRef(Date.now());
  const advancedRef = useRef(false);
  const [resending, setResending] = useState(false);

  const expectedEmail = useMemo(() => (typeof email === "string" ? email.toLowerCase() : null), [email]);

  const canAdvance = useCallback(
    (candidate: Session | null) => {
      if (!candidate?.user?.email_confirmed_at) return false;
      if (expectedEmail && candidate.user.email?.toLowerCase() !== expectedEmail) return false;
      const lastSignIn = candidate.user.last_sign_in_at ? new Date(candidate.user.last_sign_in_at).getTime() : 0;
      return lastSignIn > startedAtRef.current;
    },
    [expectedEmail]
  );

  const advanceToOnboarding = useCallback(
    (nextSession: Session) => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      setSession(nextSession);
      nav.reset({
        index: 0,
        routes: [{ name: "OnboardingGender" }]
      });
    },
    [nav, setSession]
  );

  useEffect(() => {
    let active = true;
    const maybeAdvance = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const freshSession = data?.session ?? null;
        if (!active || !freshSession || !canAdvance(freshSession)) return;
        advanceToOnboarding(freshSession);
      } catch {
        // ignore and stay on screen
      }
    };

    const unsubscribe = nav.addListener("focus", maybeAdvance);
    void maybeAdvance();
    const interval = setInterval(() => {
      void maybeAdvance();
    }, 2500);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [advanceToOnboarding, canAdvance, nav, setSession, supabase]);

  useEffect(() => {
    if (!session || !canAdvance(session)) {
      return;
    }
    advanceToOnboarding(session);
  }, [advanceToOnboarding, canAdvance, session]);

  const openInbox = async () => {
    const inboxUrls = [
      "message://", // Apple Mail inbox
      "googlegmail://", // Gmail
      "ms-outlook://", // Outlook
      "readdle-spark://", // Spark
      "yahoo://", // Yahoo Mail
      "ymail://",
      "yandexmail://", // Yandex
      "yandex://",
      "mymail://", // myMail (Mail.ru group)
      "mailru-mail://" // Mail.ru
    ];

    for (const url of inboxUrls) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        // keep trying other schemes
      }
    }

    Alert.alert(copy.mailAppMissingTitle, copy.mailAppMissingBody);
  };

  const handleResendEmail = async () => {
    if (resending) return;
    const targetEmail = email ?? session?.user?.email ?? null;
    if (!targetEmail) {
      Alert.alert(copy.resendEmailErrorTitle, copy.resendEmailMissing);
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: getEmailRedirectUrl() }
      });
      if (error) {
        throw error;
      }
      Alert.alert(copy.resendEmailSentTitle, copy.resendEmailSentBody);
    } catch (err: any) {
      Alert.alert(copy.resendEmailErrorTitle, err?.message ?? copy.resendEmailErrorBody);
    } finally {
      setResending(false);
    }
  };

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.container}>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>
            {copy.body}
            {email ? `\n\n(${email})` : ""}
          </Text>
          <Text style={styles.hint}>{copy.hint}</Text>

          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]} onPress={openInbox}>
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryInner}
            >
              <Text style={styles.primaryText}>{copy.openMail}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.resendButton,
              resending && styles.resendButtonDisabled,
              pressed && !resending && styles.resendButtonPressed
            ]}
            onPress={handleResendEmail}
            disabled={resending}
          >
            <Text style={[styles.resendText, resending && styles.resendTextDisabled]}>
              {resending ? copy.resendEmailLoading : copy.resendEmail}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}
            onPress={() => navigation.replace("CreateAccount", { mode: "email" })}
          >
            <Text style={styles.secondaryText}>{copy.backToRegister}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 18
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: PALETTE.sand,
    textAlign: "center"
  },
  body: {
    color: "rgba(242,231,215,0.85)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22
  },
  hint: {
    color: "rgba(242,231,215,0.75)",
    textAlign: "center"
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden"
  },
  primaryInner: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  primaryButtonPressed: {
    opacity: 0.9
  },
  primaryText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16
  },
  resendButton: {
    borderColor: "#4b503b",
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  resendButtonDisabled: {
    opacity: 0.75
  },
  resendButtonPressed: {
    opacity: 0.88
  },
  resendText: {
    textAlign: "center",
    color: PALETTE.sand,
    fontWeight: "700",
    fontSize: 15
  },
  resendTextDisabled: {
    color: "rgba(242,231,215,0.6)"
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryButtonPressed: {
    opacity: 0.85
  },
  secondaryText: {
    color: PALETTE.gold,
    textAlign: "center",
    fontWeight: "700"
  }
});

export default EmailPendingScreen;
