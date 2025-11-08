"use client";

import { useState } from "react";
import {
  View,
  Text,
  Button,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { getSupabase } from "../../lib/supabase";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const VISIBILITY_OPTIONS = [
  { value: "public", label: "Öffentlich" },
  { value: "match_only", label: "Nur Matches" },
  { value: "whitelist", label: "Whitelist" },
  { value: "blurred_until_match", label: "Bis Match geblurrt" },
] as const;

type VisibilityMode = (typeof VISIBILITY_OPTIONS)[number]["value"];

const fetchWithAuth = async (path: string, body: unknown) => {
  const supabase = getSupabase();
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error("Keine Session");
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }
  return response.json();
};

export const UploadPhotoScreen = () => {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [visibility, setVisibility] = useState<VisibilityMode>("match_only");
  const [isUploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: false,
    });
    if (!result.canceled) {
      setAsset(result.assets[0]);
    }
  };

  const upload = async () => {
    if (!asset) return;
    if (!API_BASE) {
      Alert.alert("Konfiguration fehlt", "EXPO_PUBLIC_API_URL ist nicht gesetzt.");
      return;
    }

    setUploading(true);
    try {
      const supabase = getSupabase();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Keine Session");

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const storagePath = `${userData.user.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("photos_private")
        .upload(storagePath, blob, {
          upsert: false,
          contentType: asset.mimeType ?? "image/jpeg",
        });
      if (uploadError) throw uploadError;

      const result = await fetchWithAuth("/api/photos/register", {
        storagePath,
        visibility_mode: visibility,
      });

      Alert.alert("Upload erfolgreich", `Foto-ID: ${result.photoId}`);
      setAsset(null);
    } catch (err) {
      console.warn("Upload error", err);
      Alert.alert("Fehler", (err as Error).message ?? "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Foto auswählen" onPress={pickImage} />
      {asset ? <Image source={{ uri: asset.uri }} style={styles.preview} /> : null}

      <View style={styles.segmentGroup}>
        {VISIBILITY_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setVisibility(option.value)}
            style={[styles.segment, visibility === option.value && styles.segmentActive]}
          >
            <Text
              style={
                visibility === option.value
                  ? styles.segmentTextActive
                  : styles.segmentText
              }
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isUploading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Hochladen" onPress={upload} disabled={!asset} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  preview: {
    width: "100%",
    height: 240,
    borderRadius: 24,
  },
  segmentGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentActive: {
    backgroundColor: "#0b6e4f",
    borderColor: "#0b6e4f",
  },
  segmentText: {
    color: "#0F172A",
  },
  segmentTextActive: {
    color: "white",
    fontWeight: "600",
  },
});
