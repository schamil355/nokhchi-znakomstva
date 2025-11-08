"use client";

import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { getSupabase } from "../../lib/supabase";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

type Props = {
  photoId: number;
  preferredVariant?: "original" | "blur";
  style?: object;
};

type SignResponse = {
  url: string;
  variant: "original" | "blur";
};

export const GuardedPhoto = ({
  photoId,
  preferredVariant = "original",
  style,
}: Props) => {
  const [state, setState] = useState<SignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const supabase = getSupabase();
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const response = await fetch(`${API_BASE}/api/photos/sign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ photoId, variant: preferredVariant }),
        });
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as SignResponse;
        if (active) {
          setState(payload);
          setError(null);
        }
      } catch {
        if (active) {
          setError("Foto geschützt");
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [photoId, preferredVariant]);

  if (error) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>{error}</Text>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={[styles.fallback, style]}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Image source={{ uri: state.url }} style={[styles.image, style]} />;
};

const styles = StyleSheet.create({
  fallback: {
    width: "100%",
    height: 240,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#666",
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 24,
  },
});
