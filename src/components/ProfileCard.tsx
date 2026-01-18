import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import GuardedPhoto from "./GuardedPhoto";
import { Profile } from "../types";
import { track } from "../lib/analytics";
import { SupportedLocale, useLocalizedCopy } from "../localization/LocalizationProvider";
import { formatCountryLabel, isWithinChechnyaRadius } from "../lib/geo";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl, PROFILE_BUCKET } from "../lib/storage";
import { getSignedPhotoUrl } from "../services/photoService";
import { getCachedPhotoUri, setCachedPhotoUri } from "../lib/photoCache";
import { sleep } from "../lib/timing";

type ProfileCardProps = {
  profile: Profile;
  onLike: () => void;
  onSkip: () => void;
  onDirectChat?: () => void;
  onReport?: () => void;
  directChatDisabled?: boolean;
  reportDisabled?: boolean;
  onView?: (profile: Profile) => void;
  showActions?: boolean;
  compassSummary?: { matches: number; total: number };
  fillHeight?: boolean;
  cardHeight?: number;
};

type CardCopy = {
  verified: string;
  locationUnknown: string;
  locationChechnya: string;
  comingSoonTitle: string;
  comingSoonSubtitle: string;
  intentionLabels: Record<string, string>;
  noPhoto: string;
  compassLabel: (matches: number, total: number) => string;
};

const translations: Record<SupportedLocale, CardCopy> = {
  de: {
    verified: "Verifiziert",
    locationUnknown: "Unbekannter Ort",
    locationChechnya: "Tschetschenien",
    comingSoonTitle: "Bald verfügbar",
    comingSoonSubtitle: "Diese Funktion wird gerade entwickelt.",
    intentionLabels: {
      serious: "Ernsthafte Absichten",
      casual: "Locker & offen",
      friendship: "Freundschaft"
    },
    noPhoto: "Kein Foto",
    compassLabel: (matches, total) => `Kompass: ${matches}/${total}`
  },
  en: {
    verified: "Verified",
    locationUnknown: "Unknown location",
    locationChechnya: "Chechnya",
    comingSoonTitle: "Coming soon",
    comingSoonSubtitle: "This action will be available shortly.",
    intentionLabels: {
      serious: "Serious intentions",
      casual: "Open minded",
      friendship: "Friendship"
    },
    noPhoto: "No photo yet",
    compassLabel: (matches, total) => `Compass: ${matches}/${total}`
  },
  fr: {
    verified: "Vérifié",
    locationUnknown: "Lieu inconnu",
    locationChechnya: "Tchétchénie",
    comingSoonTitle: "Bientôt",
    comingSoonSubtitle: "Cette action arrive très vite.",
    intentionLabels: {
      serious: "Relation sérieuse",
      casual: "Ouvert d'esprit",
      friendship: "Amitié"
    },
    noPhoto: "Pas encore de photo",
    compassLabel: (matches, total) => `Compas : ${matches}/${total}`
  },
  ru: {
    verified: "Проверено",
    locationUnknown: "Местоположение неизвестно",
    locationChechnya: "Чечня",
    comingSoonTitle: "Скоро",
    comingSoonSubtitle: "Эта функция скоро появится.",
    intentionLabels: {
      serious: "Серьёзные намерения",
      casual: "Лёгкое общение",
      friendship: "Дружба"
    },
    noPhoto: "Нет фото",
    compassLabel: (matches, total) => `Компас: ${matches}/${total}`
  }
};

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const verifiedBadgeIcon = require("../../assets/icons/icon.png");
const chechenBadgeIcon = require("../../assets/icons/NOCHXII.png");

const ProfileCard = ({
  profile,
  onLike,
  onSkip,
  onDirectChat,
  onReport,
  directChatDisabled,
  reportDisabled,
  onView,
  showActions = true,
  compassSummary,
  fillHeight = false,
  cardHeight
}: ProfileCardProps) => {
  const copy = useLocalizedCopy(translations);
  const photos = profile.photos?.filter(Boolean) ?? [];
  const mainPhoto = photos[0];
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[activeIndex] ?? mainPhoto;
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [photoUri, setPhotoUri] = useState<string | null>(mainPhoto?.url ?? null);
  const age = calculateAge(profile.birthday);
  const isInChechnya = isWithinChechnyaRadius(profile.latitude, profile.longitude);
  const locationLabel = isInChechnya
    ? copy.locationChechnya
    : (formatCountryLabel(profile.country) ?? copy.locationUnknown);
  const showChechenBadge = profile.intention === "serious";
  const compassText =
    compassSummary && compassSummary.total > 0
      ? copy.compassLabel(compassSummary.matches, compassSummary.total)
      : null;
  const isOnline = useMemo(() => {
    if (!profile.lastActiveAt) {
      return false;
    }
    const lastActiveMs = new Date(profile.lastActiveAt).getTime();
    if (!Number.isFinite(lastActiveMs)) {
      return false;
    }
    return Date.now() - lastActiveMs <= ONLINE_THRESHOLD_MS;
  }, [profile.lastActiveAt]);
  const canDirectChat = Boolean(onDirectChat) && !directChatDisabled;
  const canReport = Boolean(onReport) && !reportDisabled;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    onView?.(profile);
    void track("view_profile", { targetId: profile.userId });
  }, [onView, profile, profile.userId]);

  useEffect(() => {
    setActiveIndex(0);
    setPhotoUri(mainPhoto?.url ?? null);
  }, [profile.userId, mainPhoto?.url]);

  const cacheKey = useMemo(() => {
    if (profile.primaryPhotoPath && activeIndex === 0) {
      return `path:${profile.primaryPhotoPath}`;
    }
    if (profile.primaryPhotoId && activeIndex === 0) {
      return `guard:${profile.primaryPhotoId}`;
    }
    const assetCandidate =
      (typeof activePhoto?.assetId === "number" ? activePhoto.assetId : Number(activePhoto?.id)) ??
      (typeof mainPhoto?.assetId === "number" ? mainPhoto.assetId : Number(mainPhoto?.id));
    if (assetCandidate && Number.isFinite(assetCandidate)) {
      return `asset:${assetCandidate}`;
    }
    if (activePhoto?.url) {
      return `url:${activePhoto.url}`;
    }
    return null;
  }, [
    activeIndex,
    activePhoto?.assetId,
    activePhoto?.id,
    activePhoto?.url,
    mainPhoto?.assetId,
    mainPhoto?.id,
    profile.primaryPhotoId,
    profile.primaryPhotoPath
  ]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!cacheKey && !activePhoto?.url && !profile.primaryPhotoPath && !profile.primaryPhotoId) {
        setPhotoUri(null);
        return;
      }

      const cached = getCachedPhotoUri(cacheKey);
      if (cached) {
        setPhotoUri(cached);
        return;
      }

      let resolved: string | null = null;
      try {
        if (activePhoto?.url) {
          resolved = activePhoto.url;
          setCachedPhotoUri(cacheKey, activePhoto.url);
          setPhotoUri(resolved);
          return;
        }
        const cached = getCachedPhotoUri(cacheKey);
        if (cached) {
          resolved = cached;
          setPhotoUri(resolved);
          return;
        }

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

        // Prefer primaryPhotoId (guarded via backend) to avoid storage RLS misses.
        const assetCandidate =
          profile.primaryPhotoId ??
          (typeof activePhoto?.assetId === "number"
            ? activePhoto.assetId
            : Number.isFinite(Number(activePhoto?.id))
              ? Number(activePhoto?.id)
              : null);

        if (assetCandidate && Number.isFinite(assetCandidate)) {
          const signed = await tryFetch(() => getSignedPhotoUrl(assetCandidate as number, "original"));
          if (active && signed?.url) {
            resolved = signed.url;
            setCachedPhotoUri(cacheKey ?? `asset:${assetCandidate}`, signed.url);
            setPhotoUri(resolved);
            return;
          }
        }

        const pathCandidate =
          (profile.primaryPhotoPath && activeIndex === 0 && profile.primaryPhotoPath) ||
          activePhoto?.storagePath ||
          mainPhoto?.storagePath;

        if (pathCandidate) {
          const signed = await tryFetch(() => getPhotoUrl(pathCandidate, supabase, PROFILE_BUCKET));
          if (active && signed) {
            resolved = signed;
            setCachedPhotoUri(cacheKey ?? `path:${pathCandidate}`, signed);
            setPhotoUri(resolved);
            return;
          }
        }
      } catch (error) {
        console.warn("[ProfileCard] failed to fetch photo", error);
      }
      if (active) {
        setPhotoUri(resolved);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    activeIndex,
    cacheKey,
    activePhoto?.assetId,
    activePhoto?.id,
    activePhoto?.url,
    activePhoto?.storagePath,
    mainPhoto?.assetId,
    mainPhoto?.id,
    mainPhoto?.storagePath,
    profile.primaryPhotoPath,
    profile.primaryPhotoId,
    supabase
  ]);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    if (isOnline) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.35,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true
          })
        ])
      );
      animation.start();
    } else {
      pulseScale.setValue(1);
    }
    return () => {
      animation?.stop();
    };
  }, [isOnline, pulseScale]);

  const handleNextPhoto = () => {
    if (photos.length <= 1) return;
    setActiveIndex((prev) => {
      const next = (prev + 1) % photos.length;
      const nextPhoto = photos[next];
      if (nextPhoto?.url) {
        setPhotoUri(nextPhoto.url);
      }
      return next;
    });
  };

  const resolvedAssetId =
    typeof activePhoto?.assetId === "number"
      ? activePhoto.assetId
      : Number.isFinite(Number(activePhoto?.id))
        ? Number(activePhoto?.id)
        : null;

  const isIncognito = Boolean((profile as any).isIncognito ?? (profile as any).is_incognito);
  const totalPhotos = photos.length || 1;
  const cardStyle = [styles.card, fillHeight && styles.cardFill, cardHeight ? { height: cardHeight } : null];
  const sizedWrapperStyle = fillHeight
    ? styles.photoWrapperFill
    : cardHeight
      ? styles.photoWrapperFixed
      : styles.photoWrapperSized;

  return (
    <View style={cardStyle}>
      <View style={[styles.photoWrapper, sizedWrapperStyle]}>
        <Pressable style={styles.mediaPressable} onPress={handleNextPhoto}>
          {isIncognito ? (
            resolvedAssetId ? (
              <GuardedPhoto
                photoId={resolvedAssetId}
                style={styles.media}
                blur={isIncognito}
                lockPosition="top-right"
              />
            ) : (
              <LinearGradient
                colors={["#b5b5b5", "#f2f2f2"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.mediaImage, styles.lockGradientTile]}
              >
                <Ionicons name="lock-closed" size={28} color="#f7f7f7" style={styles.lockIconTopRight} />
              </LinearGradient>
            )
          ) : photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.mediaImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              onError={() => setPhotoUri(null)}
            />
          ) : resolvedAssetId ? (
            <GuardedPhoto
              photoId={resolvedAssetId}
              style={styles.media}
            />
          ) : (
            <View style={[styles.mediaImage, styles.mediaPlaceholder]}>
              <Animated.View style={styles.placeholderPulse} />
            </View>
          )}
        </Pressable>
        {totalPhotos >= 2 ? (
          <View style={styles.progressRow} pointerEvents="none">
            {photos.map((_, index) => (
              <View
                key={`prog-${profile.userId}-${index}`}
                style={[styles.progressBar, index === activeIndex && styles.progressBarActive]}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.gradientOverlay} pointerEvents="none" />
        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {profile.displayName}, {age}
            </Text>
            <Animated.View
              style={[
                styles.statusDot,
                isOnline ? styles.statusDotOnline : styles.statusDotOffline,
                { transform: [{ scale: pulseScale }] }
              ]}
            />
            {profile.verified ? (
              <View style={styles.verifiedBadge}>
                <View style={styles.verifiedIconBubble}>
                  <Image source={verifiedBadgeIcon} style={styles.verifiedIcon} />
                </View>
                <Text style={styles.verifiedText}>{copy.verified}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#fff" />
            <Text style={styles.locationText}>{locationLabel}</Text>
          </View>
          {(showChechenBadge || compassText) ? (
            <View style={styles.badgesRow}>
              {compassText ? (
                <View style={styles.compassBadge}>
                  <Ionicons name="compass-outline" size={14} color="#f2e7d7" />
                  <Text style={styles.compassBadgeText}>{compassText}</Text>
                </View>
              ) : null}
              {showChechenBadge ? (
                <View style={styles.chechenBadge}>
                  <Image source={chechenBadgeIcon} style={styles.chechenBadgeIcon} />
                  <Text style={styles.chechenBadgeText}>Нохчи</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        {showActions ? (
          <View style={styles.actionsRow}>
            {onReport ? (
              <Pressable
                style={[styles.actionCircle, styles.outlineButton, !canReport && styles.actionDisabled]}
                onPress={onReport}
                disabled={!canReport}
                accessibilityRole="button"
                accessibilityLabel="Report user"
              >
                <Ionicons name="alert" size={24} color="#fff" />
              </Pressable>
            ) : null}
            <Pressable style={[styles.actionCircle, styles.outlineButton, styles.smallAction]} onPress={onSkip}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            {onDirectChat ? (
              <Pressable
                style={[
                  styles.actionCircle,
                  styles.filledButton,
                  styles.smallAction,
                  !canDirectChat && styles.actionDisabled
                ]}
                onPress={onDirectChat}
                disabled={!canDirectChat}
                accessibilityRole="button"
                accessibilityLabel="Direct chat"
              >
                <LinearGradient
                  colors={["#d9c08f", "#8b6c2a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filledCircle}
                >
                  <Ionicons name="paper-plane" size={22} color="#fff" />
                </LinearGradient>
              </Pressable>
            ) : null}
            <Pressable style={[styles.actionCircle, styles.filledButton]} onPress={onLike}>
              <LinearGradient
                colors={["#0f3b2c", "#0b1f16"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.filledCircle}
              >
                <Ionicons name="checkmark" size={26} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const calculateAge = (value: string | Date) => {
  const birthday = value instanceof Date ? value : new Date(value);
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDelta = today.getMonth() - birthday.getMonth();
  const dayDelta = today.getDate() - birthday.getDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }
  return age;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingBottom: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#4b503b",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 5
  },
  cardFill: {
    flex: 1
  },
  photoWrapper: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0a0a0a"
  },
  photoWrapperSized: {
    aspectRatio: 1
  },
  photoWrapperFill: {
    flex: 1,
    minHeight: 0
  },
  photoWrapperFixed: {
    flex: 1,
    minHeight: 0
  },
  mediaPressable: {
    width: "100%",
    height: "100%"
  },
  media: {
    width: "100%",
    height: "100%",
    borderRadius: 24
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24
  },
  mediaPlaceholder: {
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center"
  },
  lockGradientTile: {
    borderRadius: 24,
    width: "100%",
    height: "100%"
  },
  lockIconTopRight: {
    position: "absolute",
    top: 72,
    right: 12
  },
  placeholderPulse: {
    width: "50%",
    height: "50%",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  progressRow: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 6
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)"
  },
  progressBarActive: {
    backgroundColor: "#fff"
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.1)"
  },
  meta: {
    position: "absolute",
    bottom: 82,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 10
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  name: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700"
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  statusDotOffline: {
    backgroundColor: "#ffb347"
  },
  statusDotOnline: {
    backgroundColor: "#19bc7c",
    shadowColor: "#19bc7c",
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 4
  },
  verifiedBadge: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
    marginLeft: -4
  },
  verifiedIconBubble: {
    width: 10,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4
  },
  verifiedIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain"
  },
  verifiedText: {
    color: "#fff",
    fontSize: 11,
    marginLeft: 0,
    fontWeight: "600"
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  locationText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500"
  },
  badgesRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap"
  },
  compassBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,59,44,0.65)",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.35)"
  },
  compassBadgeText: {
    color: "#f2e7d7",
    fontSize: 13,
    fontWeight: "600"
  },
  chechenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 8
  },
  chechenBadgeIcon: {
    width: 18,
    height: 18,
    borderRadius: 9
  },
  chechenBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500"
  },
  actionsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12
  },
  actionCircle: {
    width: 67.32,
    height: 67.32,
    borderRadius: 33.66,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  actionDisabled: {
    opacity: 0.6
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.2,
    borderColor: "#ffffff"
  },
  filledButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "hidden"
  },
  filledCircle: {
    width: "100%",
    height: "100%",
    borderRadius: 33.66,
    alignItems: "center",
    justifyContent: "center"
  },
  smallAction: {
    width: 59.4,
    height: 59.4,
    borderRadius: 29.7
  }
});

export default ProfileCard;
