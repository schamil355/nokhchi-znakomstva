import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { getSignedPhotoUrl } from "../services/photoService";

const DEFAULT_TTL_MS = 120_000;
const REFRESH_GUARD_MS = 10_000;
const RETRY_BASE_DELAY_MS = 2_000;
const RETRY_MAX_DELAY_MS = 60_000;

type GuardedPhotoProps = {
  photoId: number;
  style?: StyleProp<ViewStyle>;
};

const GuardedPhoto = ({ photoId, style }: GuardedPhotoProps) => {
  const [state, setState] = useState<{ url: string; modeReturned: "original" | "blur" } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshHandle = useRef<NodeJS.Timeout | null>(null);
  const retryDelayRef = useRef(RETRY_BASE_DELAY_MS);
  const opacity = useRef(new Animated.Value(0)).current;
  const loadRef = useRef<(refresh?: boolean) => Promise<void>>();

  const scheduleRefresh = useCallback(
    (ttlMs?: number) => {
      if (refreshHandle.current) {
        clearTimeout(refreshHandle.current);
      }
      const budget = Math.max(REFRESH_GUARD_MS, (ttlMs ?? DEFAULT_TTL_MS) - REFRESH_GUARD_MS);
      refreshHandle.current = setTimeout(() => {
        loadRef.current?.(true).catch(() => {
          // retry handled inside load
        });
      }, budget);
    },
    []
  );

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await getSignedPhotoUrl(photoId);
        setState(result);
        retryDelayRef.current = RETRY_BASE_DELAY_MS;
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }).start();
        const ttlSeconds = result.ttl ?? DEFAULT_TTL_MS / 1000;
        const ttlMs = ttlSeconds * 1000;
        scheduleRefresh(ttlMs);
      } catch (err: any) {
        setError(err.message ?? "Konnte Foto nicht laden.");
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, RETRY_MAX_DELAY_MS);
        if (refreshHandle.current) {
          clearTimeout(refreshHandle.current);
        }
        refreshHandle.current = setTimeout(() => {
          load(true).catch(() => {
            // handled above
          });
        }, retryDelayRef.current);
      } finally {
        setLoading(false);
      }
    },
    [opacity, photoId, scheduleRefresh]
  );

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    load();
    return () => {
      if (refreshHandle.current) {
        clearTimeout(refreshHandle.current);
      }
    };
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (error || !state) {
    return (
      <Pressable style={[styles.placeholder, style]} onPress={() => load(false)}>
        <Text style={styles.placeholderText}>{error ?? "Foto nicht verfügbar"}</Text>
        <Text style={styles.retryText}>Tippen zum Neu laden</Text>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.photoWrapper, style, { opacity }]}> 
      <Image source={{ uri: state.url }} style={styles.photo} resizeMode="cover" />
      {state.modeReturned === "blur" ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Nur verschwommen sichtbar</Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    width: "100%",
    height: 360,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 12
  },
  placeholderText: {
    textAlign: "center",
    color: "#666",
    fontSize: 13
  },
  retryText: {
    marginTop: 6,
    fontSize: 12,
    color: "#2f5d62"
  },
  photoWrapper: {
    width: "100%",
    height: 360,
    borderRadius: 12,
    overflow: "hidden"
  },
  photo: {
    width: "100%",
    height: "100%"
  },
  badge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600"
  }
});

export default GuardedPhoto;
