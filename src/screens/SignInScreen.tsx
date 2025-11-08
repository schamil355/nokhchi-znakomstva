import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { signInWithPassword } from "../services/authService";
import { useAuthStore } from "../state/authStore";

type Props = NativeStackScreenProps<any>;

const SignInScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setLoadingState = useAuthStore((state) => state.setLoading);

  const handleSubmit = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setLoadingState(true);

    try {
      await signInWithPassword(email.trim().toLowerCase(), password);
    } catch (error: any) {
      Alert.alert("Anmeldung fehlgeschlagen", error.message ?? "Bitte prüfe deine Angaben.");
    } finally {
      setLoading(false);
      setLoadingState(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Willkommen zurück</Text>
        <TextInput
          style={styles.input}
          placeholder="E-Mail"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Passwort"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Lädt..." : "Einloggen"}</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>Neu hier? Konto erstellen</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 24
  },
  card: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24
  },
  input: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },
  button: {
    backgroundColor: "#2f5d62",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16
  },
  link: {
    textAlign: "center",
    color: "#2f5d62",
    fontWeight: "500"
  }
});

export default SignInScreen;
