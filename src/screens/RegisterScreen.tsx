import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { signUpWithPassword } from "../services/authService";
import { Intention, Gender } from "../types";

type Props = NativeStackScreenProps<any>;

const genders: Gender[] = ["female", "male", "nonbinary"];
const intentions: Intention[] = ["serious", "casual", "friendship"];

const RegisterScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [birthday, setBirthday] = useState(new Date(2000, 0, 1));
  const [gender, setGender] = useState<Gender>("female");
  const [intention, setIntention] = useState<Intention>("serious");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      const profile = {
        displayName,
        birthday: birthday.toISOString(),
        bio,
        gender,
        intention,
        interests: interests
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        photos: []
      };
      await signUpWithPassword({
        email: email.trim().toLowerCase(),
        password,
        displayName,
        birthday: birthday.toISOString(),
        gender,
        intention,
        profile
      });
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }]
      });
    } catch (error: any) {
      Alert.alert("Registrierung fehlgeschlagen", error.message ?? "Bitte Eingaben prüfen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Profil erstellen</Text>
          <TextInput
            style={styles.input}
            placeholder="E-Mail"
            autoCapitalize="none"
            keyboardType="email-address"
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
          <TextInput
            style={styles.input}
            placeholder="Dein Name"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Pressable style={styles.input} onPress={() => setShowPicker(true)}>
            <Text style={{ color: "#333" }}>{birthday.toLocaleDateString()}</Text>
          </Pressable>
          {showPicker && (
            <DateTimePicker
              value={birthday}
              mode="date"
              maximumDate={new Date(new Date().getFullYear() - 18, 11, 31)}
              display="spinner"
              onChange={(_, date) => {
                setShowPicker(false);
                if (date) {
                  setBirthday(date);
                }
              }}
            />
          )}
          <View style={styles.segmentContainer}>
            {genders.map((option) => (
              <Pressable
                key={option}
                onPress={() => setGender(option)}
                style={[styles.segment, gender === option && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, gender === option && styles.segmentTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.segmentContainer}>
            {intentions.map((option) => (
              <Pressable
                key={option}
                onPress={() => setIntention(option)}
                style={[styles.segment, intention === option && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, intention === option && styles.segmentTextActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Kurz über dich"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />
          <TextInput
            style={styles.input}
            placeholder="Interessen (Komma-getrennt)"
            value={interests}
            onChangeText={setInterests}
          />
          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Wird erstellt..." : "Registrieren"}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Bereits ein Konto? Einloggen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f5f5f5"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16
  },
  input: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 16
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  segmentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 4
  },
  segmentActive: {
    backgroundColor: "#2f5d62"
  },
  segmentText: {
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
    textTransform: "capitalize"
  },
  segmentTextActive: {
    color: "#fff"
  },
  button: {
    backgroundColor: "#2f5d62",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 16
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600"
  },
  link: {
    textAlign: "center",
    color: "#2f5d62",
    fontWeight: "500"
  }
});

export default RegisterScreen;
