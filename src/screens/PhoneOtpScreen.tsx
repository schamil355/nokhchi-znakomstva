import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";
import { upsertProfile } from "../services/profileService";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";

type Props = NativeStackScreenProps<any>;

const ACCENT = "#0d6e4f";

const translations = {
  de: {
    title: "SMS-Code eingeben",
    subtitle: "Wir haben dir einen Bestätigungscode gesendet.",
    placeholder: "123456",
    submit: "Bestätigen",
    invalidTitle: "Code ungültig",
    invalidBody: "Bitte erneut versuchen.",
    back: "Zurück"
  },
  en: {
    title: "Enter SMS code",
    subtitle: "We sent you a verification code.",
    placeholder: "123456",
    submit: "Confirm",
    invalidTitle: "Invalid code",
    invalidBody: "Please try again.",
    back: "Back"
  },
  fr: {
    title: "Saisis le code SMS",
    subtitle: "Nous t'avons envoyé un code de vérification.",
    placeholder: "123456",
    submit: "Valider",
    invalidTitle: "Code invalide",
    invalidBody: "Merci de réessayer.",
    back: "Retour"
  },
  ru: {
    title: "Введите SMS-код",
    subtitle: "Мы отправили проверочный код.",
    placeholder: "123456",
    submit: "Подтвердить",
    invalidTitle: "Код недействителен",
    invalidBody: "Попробуйте ещё раз.",
    back: "Назад"
  }
};

const PhoneOtpScreen = ({ navigation, route }: Props) => {
  const copy = useLocalizedCopy(translations);
  const phoneParam = route?.params?.phone as string | undefined;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const errorCopy = useErrorCopy();

  const normalizedPhone = useMemo(() => phoneParam?.trim().replace(/\s+/g, "") ?? "", [phoneParam]);

  useEffect(() => {
    if (!phoneParam) {
      navigation.replace("CreateAccount", { mode: "phone" });
    }
  }, [navigation, phoneParam]);

  const handleVerify = async () => {
    if (otp.length < 4 || loading || !normalizedPhone) {
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: "sms"
      });
      if (error) {
        throw error;
      }
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      if (userId) {
        const fallbackName =
          normalizedPhone.length >= 4 ? `User ${normalizedPhone.slice(-4)}` : "User";
        try {
          await upsertProfile(userId, {
            displayName: fallbackName,
            birthday: "1990-01-01",
            bio: "",
            gender: "male",
            intention: "serious",
            interests: [],
            photos: [],
            primaryPhotoId: null,
            primaryPhotoPath: null
          });
        } catch (profileError) {
          console.warn("Failed to create placeholder profile after phone verify", profileError);
        }
      }
      if (session) {
        setSession(session);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: "OnboardingGender" }]
      });
    } catch (verifyError: any) {
      logError(verifyError, "verify-otp");
      Alert.alert(copy.invalidTitle, getErrorMessage(verifyError, errorCopy, copy.invalidBody));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={copy.back}
        >
          <Ionicons name="chevron-back" size={22} color="#0d1f1a" />
        </Pressable>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        {phoneParam ? (
          <Text style={styles.phone}>{phoneParam}</Text>
        ) : (
          <Text style={styles.phonePlaceholder}>Telefonnummer fehlt</Text>
        )}
        <TextInput
          style={styles.input}
          value={otp}
          onChangeText={setOtp}
          placeholder={copy.placeholder}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Pressable
          style={[styles.cta, (otp.length < 4 || loading) && styles.ctaDisabled]}
          onPress={handleVerify}
          disabled={otp.length < 4 || loading}
        >
          <Text style={styles.ctaText}>{loading ? "..." : copy.submit}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0d1f1a"
  },
  subtitle: {
    color: "#5c6c66"
  },
  phone: {
    color: "#0d1f1a",
    fontWeight: "600"
  },
  phonePlaceholder: {
    color: "#b23b3b",
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 4
  },
  cta: {
    marginTop: 8,
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: "center"
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  ctaDisabled: {
    opacity: 0.6
  }
});

export default PhoneOtpScreen;
