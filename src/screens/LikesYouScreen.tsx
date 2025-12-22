import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { fetchLikesForUser } from "../services/likesService";
import { useAuthStore } from "../state/authStore";
import { Profile } from "../types";
import VerifiedBadgePng from "../../assets/icons/profile-tab-verified.png";
import { ensureDirectConversation } from "../services/directChatService";
import { LinearGradient } from "expo-linear-gradient";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  clay: "#b23c3a",
  mist: "rgba(255,255,255,0.08)"
};

const ACCENT = PALETTE.pine;
const SCREEN_WIDTH = Dimensions.get("window").width;
const H_PADDING = 20;
const GRID_GAP = 16;
const CARD_WIDTH = (SCREEN_WIDTH - H_PADDING * 2 - GRID_GAP) / 2;

const translations = {
  de: {
    title: "Mochten dich",
    lockedCta: "Sieh, wer dich geliket hat",
    lockedHint: "Upgrade auf Premium, um alle Likes zu sehen.",
    unlocked: "Premium aktiv",
    empty: "Noch keine Likes."
  },
  en: {
    title: "Likes you",
    lockedCta: "See who liked you",
    lockedHint: "Upgrade to Premium to reveal your likes.",
    unlocked: "Premium active",
    empty: "No likes yet."
  },
  fr: {
    title: "T'ont aimé",
    lockedCta: "Voir qui t'a liké",
    lockedHint: "Passe en Premium pour voir tes likes.",
    unlocked: "Premium actif"
  },
  ru: {
    title: "Вам поставили лайк",
    lockedCta: "Посмотреть, кто лайкнул",
    lockedHint: "Обнови до Premium, чтобы увидеть всех.",
    unlocked: "Premium активен"
  }
};

const LikesYouScreen = () => {
  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);
  const isPremium = useAuthStore((state) => state.profile?.isPremium ?? false);
  const userId = session?.user?.id ?? null;
  const [items, setItems] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isStartingDirect, setIsStartingDirect] = useState(false);

  const calculateAge = (birthday?: string | null) => {
    if (!birthday) return "–";
    const bday = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - bday.getFullYear();
    const m = today.getMonth() - bday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) {
      age -= 1;
    }
    return age;
  };

  const loadLikes = useCallback(async () => {
    if (!userId) return;
    try {
      const likes = await fetchLikesForUser(userId);
      setItems(likes);
    } catch (error) {
      console.warn("Failed to load likes", error);
    }
  }, [userId]);

  useEffect(() => {
    void loadLikes();
  }, [loadLikes]);

  const handleUpgrade = () => {
    if (isPremium) return;
    navigation.navigate("PremiumUpsell");
  };

  const handleOpenChat = async (target: Profile) => {
    if (!session?.user?.id || !target?.userId || isStartingDirect) return;
    if (!isPremium) {
      handleUpgrade();
      return;
    }
    setIsStartingDirect(true);
    try {
      const conversationId = await ensureDirectConversation(session.user.id, target.userId);
      const parentNav: any = (navigation as any).getParent?.() ?? navigation;
      const rootNav: any = parentNav?.getParent?.() ?? parentNav;
      const navigateToChat = rootNav?.navigate ?? navigation?.navigate;
      if (!conversationId || typeof navigateToChat !== "function") {
        throw new Error("Navigation unavailable");
      }
      navigateToChat("DirectChat", { conversationId, otherUserId: target.userId });
    } catch (error) {
      console.warn("Failed to open direct chat from likes", error);
    } finally {
      setIsStartingDirect(false);
    }
  };

  const handleRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const likes = await fetchLikesForUser(userId);
      setItems(likes);
    } catch (error) {
      console.warn("Failed to refresh likes", error);
    } finally {
      setRefreshing(false);
    }
  };

  const data = useMemo(() => items, [items]);

  const total = items.length;
  const locked = !isPremium;

  useEffect(() => {
    if (isPremium) {
      void loadLikes();
    }
  }, [isPremium, loadLikes]);

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{copy.title}</Text>
            {total > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{total}</Text>
              </View>
            )}
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            renderItem={({ item }) => (
              <Pressable style={styles.card} onPress={() => handleOpenChat(item)} disabled={isStartingDirect}>
                <View style={styles.avatarWrapper}>
                  {("photos" in item ? item.photos?.[0]?.url : item.photo) ? (
                    <>
                      <Image
                        source={{ uri: ("photos" in item ? item.photos?.[0]?.url : item.photo) ?? undefined }}
                        style={styles.avatar}
                        blurRadius={locked ? 70 : 0}
                        resizeMode="cover"
                      />
                      {locked && <View style={styles.blurOverlay} />}
                    </>
                  ) : (
                    <View style={styles.avatarPlaceholder} />
                  )}
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {`${"displayName" in item ? item.displayName : "Profil"}, ${calculateAge(
                      "birthday" in item ? item.birthday : null
                    )}`}
                  </Text>
                  {"verified" in item && item.verified && (
                    <Image source={VerifiedBadgePng} style={styles.verifiedIcon} resizeMode="contain" />
                  )}
                </View>
              </Pressable>
            )}
            ListEmptyComponent={null}
          />
        </View>

        {locked ? (
          <Pressable style={[styles.cta, isStartingDirect && styles.ctaDisabled]} onPress={handleUpgrade} disabled={isStartingDirect}>
            <LinearGradient colors={[PALETTE.pine, PALETTE.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaInner}>
              <Text style={styles.ctaText}>{copy.lockedCta}</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </SafeAreaView>
    </LinearGradient>
  );
};

const AVATAR_SIZE = 140;

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.28)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: PALETTE.sand,
    letterSpacing: 0.3
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.gold,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700"
  },
  grid: {
    paddingBottom: 120,
    gap: GRID_GAP,
    paddingTop: 10
  },
  row: {
    justifyContent: "flex-start",
    columnGap: GRID_GAP,
    marginBottom: GRID_GAP
  },
  card: {
    width: CARD_WIDTH,
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 18
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.25)"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)"
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  lockBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: ACCENT,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    flexDirection: "row",
    gap: 4
  },
  lockBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  name: {
    fontWeight: "600",
    color: PALETTE.sand,
    maxWidth: CARD_WIDTH - 40,
    flexShrink: 1,
    textAlign: "center",
    fontSize: 17
  },
  verifiedIcon: {
    width: 24,
    height: 24,
    tintColor: PALETTE.gold
  },
  cta: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: "transparent",
    borderWidth: 1.4,
    borderColor: PALETTE.gold,
    padding: 2
  },
  ctaInner: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: PALETTE.pine
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  ctaDisabled: {
    opacity: 0.7
  }
});

export default LikesYouScreen;
