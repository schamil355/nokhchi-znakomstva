import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl, PROFILE_BUCKET } from "../lib/storage";
import { getSignedPhotoUrl } from "../services/photoService";
import { getCachedPhotoUri, setCachedPhotoUri } from "../lib/photoCache";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { sleep } from "../lib/timing";

const ACCENT = "#0d6e4f";
const ICON_COLOR = "#9ea4ab";
const RADAR_SIZE = 220;
const RADAR_PULSE_COUNT = 3;

const translations = {
  en: {
    tabForYou: "For you",
    tabRecent: "Recently active",
    title: "Searching for people...",
    subtitle: "If no profiles appear within a few seconds, try adjusting your filters.",
    filters: "Filter settings"
  },
  de: {
    tabForYou: "Für dich",
    tabRecent: "Zuletzt aktiv",
    title: "Suche nach Nutzern...",
    subtitle: "Wenn innerhalb weniger Sekunden keine Profile erscheinen, ändere bitte deine Filtereinstellungen.",
    filters: "Filtereinstellungen"
  },
  fr: {
    tabForYou: "Pour toi",
    tabRecent: "Récemment actifs",
    title: "Recherche de profils...",
    subtitle: "Si aucun profil n'apparaît, essaie d'ajuster tes filtres.",
    filters: "Réglages des filtres"
  },
  ru: {
    tabForYou: "Для тебя",
    tabRecent: "Недавно активны",
    title: "Ищу анкеты...",
    subtitle: "Если анкеты не появляются, попробуй изменить фильтры.",
    filters: "Настройки фильтров"
  }
};

type EmptyFeedProps = {
  onIncreaseRadius: () => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onInviteFriends?: () => void;
  onOpenFilters?: () => void;
  onOpenNotifications?: () => void;
  showChrome?: boolean;
};

const EmptyFeed = ({
  onIncreaseRadius,
  onResetFilters,
  onRetry,
  onInviteFriends,
  onOpenFilters,
  onOpenNotifications,
  showChrome = true
}: EmptyFeedProps) => {
  const copy = useLocalizedCopy(translations);
  const profile = useAuthStore((state) => state.profile);
  const [activeTab, setActiveTab] = useState<"foryou" | "recent">("foryou");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const pulseAnim = useMemo(() => new Animated.Value(0), []);
  const inlinePhotoUrl = profile?.photos?.[0]?.url ?? null;
  const primaryPhotoPath = profile?.primaryPhotoPath ?? null;
  const primaryAssetId = useMemo(() => {
    const firstPhoto = profile?.photos?.[0];
    if (!firstPhoto) {
      return null;
    }
    if (typeof firstPhoto.assetId === "number") {
      return firstPhoto.assetId;
    }
    const fromId = Number(firstPhoto.id);
    return Number.isFinite(fromId) ? fromId : null;
  }, [profile?.photos]);
  const avatarCacheKey = useMemo(() => {
    if (primaryPhotoPath) {
      return `path:${primaryPhotoPath}`;
    }
    if (typeof primaryAssetId === "number") {
      return `asset:${primaryAssetId}`;
    }
    return null;
  }, [primaryPhotoPath, primaryAssetId]);

  useEffect(() => {
    let subscribed = true;
    if (inlinePhotoUrl) {
      setAvatarUri(inlinePhotoUrl);
      setCachedPhotoUri(avatarCacheKey, inlinePhotoUrl);
      return () => {
        subscribed = false;
      };
    }
    const cached = getCachedPhotoUri(avatarCacheKey);
    if (cached) {
      setAvatarUri(cached);
      return () => {
        subscribed = false;
      };
    }
    const loadPhoto = async () => {
      const tryFetch = async <T,>(fn: () => Promise<T>, attempts = 2): Promise<T | null> => {
        for (let i = 0; i < attempts; i++) {
          try {
            return await fn();
          } catch (err) {
            if (i === attempts - 1) {
              throw err;
            }
            await sleep(300 * (i + 1));
          }
        }
        return null;
      };

      if (primaryPhotoPath) {
        try {
          const signedUrl = await tryFetch(() => getPhotoUrl(primaryPhotoPath, supabase, PROFILE_BUCKET));
          if (subscribed) {
            setAvatarUri(signedUrl);
            setCachedPhotoUri(avatarCacheKey, signedUrl);
          }
          return;
        } catch (error) {
          const message =
            typeof error === "object" && error !== null && "message" in error
              ? String((error as { message?: string }).message)
              : "";
          if (!message.includes("Object not found")) {
            console.warn("[EmptyFeed] Failed to load avatar via storage", error);
          }
        }
      }
      if (primaryAssetId !== null) {
        try {
          const signed = await tryFetch(() => getSignedPhotoUrl(primaryAssetId, "original"));
          if (subscribed && signed?.url) {
            setAvatarUri(signed.url);
            setCachedPhotoUri(avatarCacheKey ?? `asset:${primaryAssetId}`, signed.url);
          }
          return;
        } catch (error) {
          console.warn("[EmptyFeed] Failed to load avatar via photo service", error);
        }
      }
      if (subscribed) {
        setAvatarUri(null);
      }
    };
    loadPhoto();
    return () => {
      subscribed = false;
    };
  }, [avatarCacheKey, inlinePhotoUrl, primaryAssetId, primaryPhotoPath, supabase]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const renderRadar = () => {
    const rings = Array.from({ length: RADAR_PULSE_COUNT }).map((_, idx) => {
      const start = idx / RADAR_PULSE_COUNT;
      const end = start + 1 / RADAR_PULSE_COUNT;
      const scale = pulseAnim.interpolate({ inputRange: [start, end], outputRange: [0.3, 1.15], extrapolate: "clamp" });
      const opacity = pulseAnim.interpolate({ inputRange: [start, end], outputRange: [0.4, 0], extrapolate: "clamp" });
      return (
        <Animated.View
          key={idx}
          style={[
            styles.radarRing,
            {
              transform: [{ scale }],
              opacity
            }
          ]}
        />
      );
    });

    const centerAvatar = avatarUri ? (
      <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
    ) : (
      <Ionicons name="person-outline" size={32} color="#6c7179" />
    );

    return (
      <View style={styles.radarWrapper}>
        {rings}
        <View style={styles.radarCenter}>{centerAvatar}</View>
      </View>
    );
  };

  const handleTabPress = (tab: "foryou" | "recent") => {
    setActiveTab(tab);
    onRetry();
  };

  const handleNotificationPress = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
      return;
    }
    if (onInviteFriends) {
      onInviteFriends();
      return;
    }
    onRetry();
  };

  const chrome = (
    <View style={styles.headerRow}>
      <View style={styles.tabRow}>
        <SegmentPill label={copy.tabForYou} active={activeTab === "foryou"} onPress={() => handleTabPress("foryou")} />
        <SegmentPill
          label={copy.tabRecent}
          active={activeTab === "recent"}
          onPress={() => handleTabPress("recent")}
        />
      </View>
      <View style={styles.actionsRow}>
        <IconButton icon="options-outline" onPress={onOpenFilters ?? onResetFilters} />
        <IconButton icon="notifications-outline" onPress={handleNotificationPress} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {showChrome && chrome}

      <View style={styles.radarContainer} pointerEvents="none">
        {renderRadar()}
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <Pressable style={styles.primaryCta} onPress={onOpenFilters ?? onResetFilters}>
        <Text style={styles.primaryCtaText}>{copy.filters}</Text>
      </Pressable>
    </View>
  );
};

const SegmentPill = ({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.segmentPill, active ? styles.segmentActive : styles.segmentInactive]}>
    <Text style={[styles.segmentLabel, active ? styles.segmentLabelActive : styles.segmentLabelInactive]}>
      {label}
    </Text>
  </Pressable>
);

const IconButton = ({ icon, onPress }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
    <Ionicons name={icon} size={18} color={ICON_COLOR} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  tabRow: {
    flexDirection: "row",
    gap: 12,
    flex: 1
  },
  segmentPill: {
    paddingVertical: 9,
    paddingHorizontal: 26,
    borderRadius: 999,
    borderWidth: 1.4
  },
  segmentActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT
  },
  segmentInactive: {
    backgroundColor: "#fff",
    borderColor: "#e4e6ea"
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6c7077"
  },
  segmentLabelActive: {
    color: "#fff"
  },
  segmentLabelInactive: {
    color: "#50555e"
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#dfe2e8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  iconButtonPressed: {
    opacity: 0.6
  },
  radarContainer: {
    marginTop: 24,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  radarWrapper: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: "center",
    justifyContent: "center"
  },
  radarCenter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(13, 110, 79, 0.2)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f3f4f6"
  },
  radarRing: {
    position: "absolute",
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(13, 110, 79, 0.35)"
  },
  copyBlock: {
    marginTop: 24,
    alignItems: "center",
    paddingHorizontal: 12,
    alignSelf: "center"
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#232528"
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#6c7179",
    textAlign: "center",
    lineHeight: 22
  },
  primaryCta: {
    marginTop: 20,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 48,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    shadowColor: "#0d6e4f",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  primaryCtaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  }
});

export default EmptyFeed;
