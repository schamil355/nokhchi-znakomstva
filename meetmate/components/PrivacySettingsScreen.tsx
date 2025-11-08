import { useEffect, useState, useTransition } from "react";
import { View, Text, Switch, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { getSupabase } from "../../lib/supabase";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const visibilityText = "Steuere, wie dein Profil angezeigt wird.";

const fetchWithAuth = async (path: string, init?: RequestInit) => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
};

type Flags = {
  is_incognito: boolean;
  show_distance: boolean;
  show_last_seen: boolean;
};

export const PrivacySettingsScreen = () => {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!API_BASE) {
      setError("API-URL fehlt (EXPO_PUBLIC_API_URL).");
      return;
    }
    fetchWithAuth("/api/settings/privacy")
      .then((data) => setFlags(data as Flags))
      .catch((err) => {
        console.warn("Privacy load failed", err);
        setError("Einstellungen konnten nicht geladen werden.");
      });
  }, []);

  const toggle = (field: keyof Flags) => {
    if (!flags) return;
    const next = { ...flags, [field]: !flags[field] };
    setFlags(next);
    startTransition(() => {
      fetchWithAuth("/api/settings/privacy", {
        method: "POST",
        body: JSON.stringify({ [field]: next[field] }),
      }).catch(() => {
        Alert.alert("Fehler", "Speichern fehlgeschlagen.");
        setFlags(flags);
      });
    });
  };

  if (!flags) {
    return (
      <View style={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator />}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privatsphäre</Text>
      <Text style={styles.description}>{visibilityText}</Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>Incognito-Modus</Text>
          <Text style={styles.helper}>Nur Likes & Matches sehen dich.</Text>
        </View>
        <Switch value={flags.is_incognito} onValueChange={() => toggle("is_incognito")} />
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>Distanz anzeigen</Text>
          <Text style={styles.helper}>Blendet km-Angaben aus.</Text>
        </View>
        <Switch
          value={flags.show_distance}
          onValueChange={() => toggle("show_distance")}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>Zuletzt online</Text>
          <Text style={styles.helper}>Steuere deinen Status.</Text>
        </View>
        <Switch
          value={flags.show_last_seen}
          onValueChange={() => toggle("show_last_seen")}
        />
      </View>

      {isPending ? <Text style={styles.helper}>Speichere …</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  description: {
    color: "#566075",
  },
  row: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: {
    flexShrink: 1,
    marginRight: 16,
  },
  label: {
    fontWeight: "600",
    fontSize: 16,
  },
  helper: {
    color: "#666",
    marginTop: 4,
  },
  error: {
    color: "red",
  },
});
