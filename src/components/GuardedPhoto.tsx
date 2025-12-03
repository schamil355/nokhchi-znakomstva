import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getSignedPhotoUrl } from "../services/photoService";
import { useLocalizedCopy } from "../localization/LocalizationProvider";

const DEFAULT_TTL_MS = 120_000;
const REFRESH_GUARD_MS = 10_000;
const RETRY_BASE_DELAY_MS = 2_000;
const RETRY_MAX_DELAY_MS = 60_000;

const translations = {
  en: {
    unavailable: "Photo not available",
    retry: "Tap to reload"
  },
  de: {
    unavailable: "Foto nicht verfügbar",
    retry: "Tippen zum Neu laden"
  },
  fr: {
    unavailable: "Photo indisponible",
    retry: "Appuie pour recharger"
  },
  ru: {
    unavailable: "Фото недоступно",
    retry: "Нажми, чтобы обновить"
  }
};

type GuardedPhotoProps = {
  photoId: number;
  style?: StyleProp<ViewStyle>;
  blur?: boolean;
  lockPosition?: "center" | "top-right";
};

const GuardedPhoto = ({ photoId, style, blur = false, lockPosition = "center" }: GuardedPhotoProps) => {
  const copy = useLocalizedCopy(translations);
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
        <Text style={styles.placeholderText}>{error ?? copy.unavailable}</Text>
        <Text style={styles.retryText}>{copy.retry}</Text>
      </Pressable>
    );
  }

  const isBlurred = blur || state?.modeReturned === "blur";

  return (
    <Animated.View style={[styles.photoWrapper, style, { opacity }]}> 
      {isBlurred ? (
        <LinearGradient
          colors={["#b5b5b5", "#f2f2f2"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.photo, styles.lockBackground]}
        >
          <Ionicons
            name="lock-closed"
            size={26}
            color="#f7f7f7"
            style={[styles.lockIcon, lockPosition === "center" ? styles.lockIconCenter : styles.lockIconTopRight]}
          />
        </LinearGradient>
      ) : (
        <Image
          source={{ uri: state.url }}
          style={styles.photo}
          resizeMode="cover"
        />
      )}
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
  lockBackground: {
    position: "relative",
    width: "100%",
    height: "100%"
  },
  lockIcon: {
    position: "absolute"
  },
  lockIconCenter: {
    top: "50%",
    left: "50%",
    transform: [{ translateX: -13 }, { translateY: -13 }]
  },
  lockIconTopRight: {
    top: 12,
    right: 12
  }
});

export default GuardedPhoto;
