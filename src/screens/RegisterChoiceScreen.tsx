import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

type Props = NativeStackScreenProps<any>;

const ACCENT = "#0d6e4f";

const translations = {
  de: {
    title: "Wie möchtest du dich registrieren?",
    subtitle: "Wähle E-Mail oder Telefonnummer.",
    email: "Mit E-Mail fortfahren",
    phone: "Mit Telefonnummer fortfahren",
    member: "Schon Mitglied?",
    login: "Einloggen"
  },
  en: {
    title: "How would you like to register?",
    subtitle: "Choose email or phone number.",
    email: "Continue with Email",
    phone: "Continue with Phone number",
    member: "Already a member?",
    login: "Log In"
  },
  fr: {
    title: "Comment veux-tu t'inscrire ?",
    subtitle: "Choisis e-mail ou numéro de téléphone.",
    email: "Continuer avec l'e-mail",
    phone: "Continuer avec le numéro de téléphone",
    member: "Déjà membre ?",
    login: "Connexion"
  },
  ru: {
    title: "Как ты хочешь зарегистрироваться?",
    subtitle: "Выбери e-mail или номер телефона.",
    email: "Продолжить с e-mail",
    phone: "Продолжить с номером телефона",
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

        <Pressable
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          onPress={() => navigation.navigate("CreateAccount", { mode: "phone" })}
        >
          <Ionicons name="call-outline" size={20} color={ACCENT} />
          <Text style={styles.optionText}>{copy.phone}</Text>
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
