import React from "react";
import SafeAreaView from "../components/SafeAreaView";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

type Props = NativeStackScreenProps<any>;

const ACCENT = "#0d6e4f";

const translations = {
  de: {
    title: "Mit E-Mail registrieren",
    subtitle: "Wir senden dir einen Bestätigungslink.",
    email: "Mit E-Mail fortfahren",
    member: "Schon Mitglied?",
    login: "Einloggen"
  },
  en: {
    title: "Register with email",
    subtitle: "We'll send you a confirmation link.",
    email: "Continue with email",
    member: "Already a member?",
    login: "Log In"
  },
  fr: {
    title: "S'inscrire avec l'e-mail",
    subtitle: "Nous t'enverrons un lien de confirmation.",
    email: "Continuer avec l'e-mail",
    member: "Déjà membre ?",
    login: "Connexion"
  },
  ru: {
    title: "Регистрация по e-mail",
    subtitle: "Мы отправим ссылку для подтверждения.",
    email: "Продолжить с e-mail",
    member: "Уже есть аккаунт?",
    login: "Войти"
  }
};

const RegisterChoiceScreen = ({ navigation }: Props) => {
  const copy = useLocalizedCopy(translations);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        <Pressable
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => navigation.navigate("CreateAccount", { mode: "email" })}
        >
          <Ionicons name="mail-outline" size={20} color={ACCENT} />
          <Text style={styles.optionText}>{copy.email}</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("SignIn")}> 
          <Text style={styles.footer}>
            {copy.member} <Text style={styles.link}>{copy.login}</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fdfdfd" },
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#1f1f1f", textAlign: "center" },
  subtitle: { color: "#555", textAlign: "center" },
  option: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#e8f4f0"
  },
  optionPressed: { backgroundColor: "#d8ece5" },
  optionText: { color: "#0d6e4f", fontWeight: "700", fontSize: 16 },
  footer: { color: "#555", marginTop: 12 },
  link: { color: ACCENT, fontWeight: "700" }
});

export default RegisterChoiceScreen;
