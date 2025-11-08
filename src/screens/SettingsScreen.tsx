import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { usePreferencesStore } from "../state/preferencesStore";
import { useAuthStore } from "../state/authStore";
import { blockUser, reportUser, unblockUser } from "../services/moderationService";
import { signOut } from "../services/authService";

const SettingsScreen = () => {
  const filters = usePreferencesStore((state) => state.filters);
  const setFilters = usePreferencesStore((state) => state.setFilters);
  const resetFilters = usePreferencesStore((state) => state.resetFilters);

  const session = useAuthStore((state) => state.session);

  const [minAge, setMinAge] = useState(String(filters.ageRange[0]));
  const [maxAge, setMaxAge] = useState(String(filters.ageRange[1]));
  const [distance, setDistance] = useState(String(filters.distanceKm));
  const [reportId, setReportId] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [blockId, setBlockId] = useState("");

  const handleSaveFilters = () => {
    const parsedMin = Number(minAge);
    const parsedMax = Number(maxAge);
    const parsedDistance = Number(distance);

    if (Number.isNaN(parsedMin) || Number.isNaN(parsedMax) || Number.isNaN(parsedDistance)) {
      Alert.alert("Ungültige Eingabe", "Bitte nutze nur Zahlenwerte.");
      return;
    }

    if (parsedMin < 18 || parsedMax < parsedMin) {
      Alert.alert("Ungültiges Alter", "Das Mindestalter beträgt 18 Jahre.");
      return;
    }

    setFilters({
      ageRange: [parsedMin, parsedMax],
      distanceKm: parsedDistance
    });
    Alert.alert("Gespeichert", "Deine Filter wurden aktualisiert.");
  };

  const handleReport = async () => {
    if (!session) {
      return;
    }
    if (!reportId || !reportReason) {
      Alert.alert("Fehlende Angaben", "Bitte gib Nutzer-ID und Grund an.");
      return;
    }
    try {
      await reportUser(session.user.id, reportId, "other", reportReason);
      Alert.alert("Danke", "Wir prüfen den gemeldeten Nutzer.");
      setReportId("");
      setReportReason("");
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Meldung konnte nicht gesendet werden.");
    }
  };

  const handleBlock = async () => {
    if (!session) {
      return;
    }
    if (!blockId) {
      Alert.alert("Fehlende Eingabe", "Bitte gib eine Nutzer-ID an.");
      return;
    }
    try {
      await blockUser(session.user.id, blockId);
      Alert.alert("Geblockt", "Der Nutzer wird nicht mehr angezeigt.");
      setBlockId("");
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Nutzer konnte nicht geblockt werden.");
    }
  };

  const handleUnblock = async () => {
    if (!session || !blockId) {
      return;
    }
    try {
      await unblockUser(session.user.id, blockId);
      Alert.alert("Aktualisiert", "Blockierung wurde entfernt.");
      setBlockId("");
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Blockierung konnte nicht entfernt werden.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      Alert.alert("Fehler", error.message ?? "Abmelden fehlgeschlagen.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Discovery-Filter</Text>
      <View style={styles.fieldRow}>
        <View style={styles.field}>
          <Text style={styles.label}>Mindestalter</Text>
          <TextInput style={styles.input} value={minAge} keyboardType="numeric" onChangeText={setMinAge} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Höchstalter</Text>
          <TextInput style={styles.input} value={maxAge} keyboardType="numeric" onChangeText={setMaxAge} />
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Entfernung (km)</Text>
        <TextInput style={styles.input} value={distance} keyboardType="numeric" onChangeText={setDistance} />
      </View>
      <Pressable style={styles.button} onPress={handleSaveFilters}>
        <Text style={styles.buttonText}>Filter speichern</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondary]} onPress={resetFilters}>
        <Text style={[styles.buttonText, styles.secondaryText]}>Zurücksetzen</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Nutzer melden</Text>
      <TextInput
        style={styles.input}
        placeholder="Nutzer-ID"
        value={reportId}
        onChangeText={setReportId}
        autoCapitalize="none"
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Grund / Beschreibung"
        value={reportReason}
        onChangeText={setReportReason}
        multiline
      />
      <Pressable style={styles.button} onPress={handleReport}>
        <Text style={styles.buttonText}>Meldung senden</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Blockieren</Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Nutzer-ID"
          value={blockId}
          onChangeText={setBlockId}
          autoCapitalize="none"
        />
        <Pressable style={[styles.button, { flex: 1 }]} onPress={handleBlock}>
          <Text style={styles.buttonText}>Blockieren</Text>
        </Pressable>
      </View>
      <Pressable style={[styles.button, styles.secondary]} onPress={handleUnblock}>
        <Text style={[styles.buttonText, styles.secondaryText]}>Blockierung aufheben</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Konto</Text>
      <Pressable style={[styles.button, styles.danger]} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Abmelden</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600"
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12
  },
  field: {
    flex: 1
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0"
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  button: {
    backgroundColor: "#2f5d62",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  secondary: {
    backgroundColor: "#e7f2f1"
  },
  secondaryText: {
    color: "#2f5d62"
  },
  danger: {
    backgroundColor: "#eb5757"
  }
});

export default SettingsScreen;
