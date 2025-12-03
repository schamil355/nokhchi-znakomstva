import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useDiscoveryFeed, useRecentProfiles } from "../hooks/useDiscoveryFeed";
import { sendLike, skipProfile } from "../services/discoveryService";
import { useAuthStore } from "../state/authStore";
import { usePreferencesStore } from "../state/preferencesStore";
import { Profile } from "../types";
import ProfileCard from "../components/ProfileCard";
import EmptyFeed from "../components/EmptyFeed";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationsStore } from "../state/notificationsStore";
import * as Notifications from "expo-notifications";

const ACCENT = "#0d6e4f";
const BORDER_COLOR = "#e4e6ea";
const MAX_DISTANCE_KM = 130;
const AUTO_EXTEND_STEP = 20;

const DiscoveryScreen = () => {
type CopyShape = {
  tabs: {
    forYou: string;
    recent: string;
  };
  matchTitle: string;
  matchBody: (name: string) => string;
  matchAlertBody: string;
  fallbackName: string;
  errors: {
    title: string;
    likeFallback: string;
    skipFallback: string;
  };
  invite: {
    title: string;
    body: string;
  };
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    tabs: { forYou: "For you", recent: "Recently active" },
    matchTitle: "New match!",
    matchBody: (name) => `You and ${name} are now a match.`,
    matchAlertBody: "Someone liked you back. You can start chatting now.",
    fallbackName: "someone",
    errors: {
      title: "Error",
      likeFallback: "We couldn't send your like.",
      skipFallback: "Couldn't skip this profile.",
    },
    invite: {
      title: "Fun fact",
      body: "Inviting friends is coming soon!",
    },
  },
  de: {
    tabs: { forYou: "Für dich", recent: "Zuletzt aktiv" },
    matchTitle: "Neues Match!",
    matchBody: (name) => `Du und ${name} seid jetzt ein Match.`,
    matchAlertBody: "Jemand hat dich auch gemocht. Ihr könnt jetzt chatten.",
    fallbackName: "jemand",
    errors: {
      title: "Fehler",
      likeFallback: "Dein Like konnte nicht gesendet werden.",
      skipFallback: "Profil konnte nicht übersprungen werden.",
    },
    invite: {
      title: "Fun Fact",
      body: "Freunde einladen folgt in Kürze!",
    },
  },
  fr: {
    tabs: { forYou: "Pour toi", recent: "Récemment actif" },
    matchTitle: "Nouveau match !",
    matchBody: (name) => `Toi et ${name} êtes désormais connectés.`,
    matchAlertBody: "Quelqu'un t'a rendu ton like. Discute dès maintenant.",
    fallbackName: "quelqu'un",
    errors: {
      title: "Erreur",
      likeFallback: "Impossible d'envoyer ton like.",
      skipFallback: "Impossible d'ignorer ce profil.",
    },
    invite: {
      title: "Fun fact",
      body: "L'invitation d'amis arrive bientôt !",
    },
  },
  ru: {
    tabs: { forYou: "Для тебя", recent: "Недавно активны" },
    matchTitle: "Новый матч!",
    matchBody: (name) => `Вы и ${name} теперь совпали.`,
    matchAlertBody: "Кто-то взаимно лайкнул тебя. Можно начинать диалог.",
    fallbackName: "кто-то",
    errors: {
      title: "Ошибка",
      likeFallback: "Не удалось отправить лайк.",
      skipFallback: "Не удалось пропустить профиль.",
    },
    invite: {
      title: "Инфо",
      body: "Приглашение друзей появится скоро!",
    },
  },
};

  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();
  const {
    data: discoveryProfiles = [],
    isLoading: isDiscoveryLoading,
    refetch: refetchDiscovery,
    isRefetching: isDiscoveryRefetching
  } = useDiscoveryFeed();
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"forYou" | "recent">("forYou");
  const [queues, setQueues] = useState<{ forYou: Profile[]; recent: Profile[] }>({
    forYou: [],
    recent: []
  });

  const {
    data: recentProfiles = [],
    isLoading: isRecentLoading,
    refetch: refetchRecent,
    isRefetching: isRecentRefetching
  } = useRecentProfiles(activeTab === "recent");
  const session = useAuthStore((state) => state.session);
  const filters = usePreferencesStore((state) => state.filters);
  const setFilters = usePreferencesStore((state) => state.setFilters);
  const resetFilters = usePreferencesStore((state) => state.resetFilters);
  const addNotification = useNotificationsStore((state) => state.addNotification);
  const hasUnseenNotifications = useNotificationsStore((state) => state.hasUnseen);

  const isRecentTab = activeTab === "recent";
  const canInteract = !isRecentTab;
  const visibleProfiles = isRecentTab ? recentProfiles : discoveryProfiles;
  const isLoading = isRecentTab ? isRecentLoading : isDiscoveryLoading;
  const isRefetching = isRecentTab ? isRecentRefetching : isDiscoveryRefetching;
  const refetch = isRecentTab ? refetchRecent : refetchDiscovery;

  const isSameQueue = useCallback((next: Profile[], prev: Profile[]) => {
    if (prev.length !== next.length) {
      return false;
    }
    for (let i = 0; i < prev.length; i++) {
      if (prev[i]?.userId !== next[i]?.userId) {
        return false;
      }
    }
    return true;
  }, []);

  useEffect(() => {
    setQueues((prev) => {
      if (isSameQueue(discoveryProfiles, prev.forYou)) {
        return prev;
      }
      return {
        ...prev,
        forYou: discoveryProfiles
      };
    });
  }, [discoveryProfiles, isSameQueue]);

  useEffect(() => {
    setQueues((prev) => {
      if (isSameQueue(recentProfiles, prev.recent)) {
        return prev;
      }
      return {
        ...prev,
        recent: recentProfiles
      };
    });
  }, [recentProfiles, isSameQueue]);

  const queue = queues[activeTab];
  const currentProfile: Profile | undefined = queue[0];

  const maybeExtendDistance = useCallback(() => {
    if (!filters.autoExtendDistance || filters.distanceKm >= MAX_DISTANCE_KM) {
      return;
    }
    const nextRadius = Math.min(filters.distanceKm + AUTO_EXTEND_STEP, MAX_DISTANCE_KM);
    setFilters({ distanceKm: nextRadius });
    refetchDiscovery();
  }, [filters.autoExtendDistance, filters.distanceKm, refetchDiscovery, setFilters]);

  const advanceQueue = useCallback(() => {
    let shouldExtend = false;
    setQueues((prev) => {
      const updated = prev[activeTab].slice(1);
      if (updated.length <= 3 && !isRefetching) {
        refetch();
      }
      if (activeTab === "forYou" && updated.length === 0) {
        shouldExtend = filters.autoExtendDistance && filters.distanceKm < MAX_DISTANCE_KM;
      }
      return {
        ...prev,
        [activeTab]: updated
      };
    });
    if (shouldExtend) {
      maybeExtendDistance();
    }
  }, [activeTab, filters.autoExtendDistance, filters.distanceKm, isRefetching, maybeExtendDistance, refetch]);

  const handleLike = async () => {
    if (!session || !currentProfile || processing || !canInteract) {
      return;
    }
    setProcessing(true);
    try {
      const result = await sendLike(session.user.id, currentProfile.userId);
      if (result.match) {
        const title = copy.matchTitle;
        Alert.alert(title, copy.matchAlertBody);
        const now = new Date().toISOString();
        addNotification({
          id: `match-${result.match.id ?? now}`,
          title,
          body: copy.matchBody(currentProfile.displayName ?? copy.fallbackName),
          receivedAt: now,
          data: {
            type: "match",
            matchId: result.match.id ?? "",
            otherUserId: currentProfile.userId,
            avatarUrl: currentProfile.photos?.[0]?.url ?? null
          }
        });
      }
      advanceQueue();
    } catch (error: any) {
        Alert.alert(copy.errors.title, error.message ?? copy.errors.likeFallback);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = async () => {
    if (!session || !currentProfile || processing || !canInteract) {
      return;
    }
    setProcessing(true);
    try {
      await skipProfile(session.user.id, currentProfile.userId);
      advanceQueue();
    } catch (error: any) {
      Alert.alert(copy.errors.title, error.message ?? copy.errors.skipFallback);
    } finally {
      setProcessing(false);
    }
  };

  const handleIncreaseRadius = useCallback(() => {
    if (isRecentTab) {
      refetchRecent();
      return;
    }
    const nextRadius = Math.min(filters.distanceKm + 25, MAX_DISTANCE_KM);
    setFilters({ distanceKm: nextRadius });
    refetchDiscovery();
  }, [filters.distanceKm, isRecentTab, refetchDiscovery, refetchRecent, setFilters]);

  const handleResetFilters = useCallback(() => {
    if (isRecentTab) {
      refetchRecent();
      return;
    }
    resetFilters();
    refetchDiscovery();
  }, [isRecentTab, refetchDiscovery, refetchRecent, resetFilters]);

  const handleInviteFriends = useCallback(() => {
    Alert.alert(copy.invite.title, copy.invite.body);
  }, [copy.invite.body, copy.invite.title]);

  const openFilters = useCallback(() => {
    const parentNav: any = (navigation as any).getParent?.() ?? navigation;
    const rootNav: any = parentNav?.getParent?.() ?? parentNav;
    if (rootNav?.navigate) {
      rootNav.navigate("Filters", { isModal: true });
    } else {
      navigation.navigate("Settings" as never);
    }
  }, [navigation]);

  const markNotificationsSeen = useNotificationsStore((state) => state.markSeen);

  const openNotifications = useCallback(() => {
    const parentNav: any = (navigation as any).getParent?.() ?? navigation;
    const rootNav: any = parentNav?.getParent?.() ?? parentNav;
    if (rootNav?.navigate) {
      rootNav.navigate("Notifications");
    }
    markNotificationsSeen();
    void Notifications.setBadgeCountAsync(0);
  }, [markNotificationsSeen, navigation]);

  // Sign-out Button (temporär) entfernt

  if (isLoading && !visibleProfiles.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.logoText}>Нохчи Знакомства</Text>
          <View style={styles.headerActions}>
            <IconButton icon="options-outline" onPress={openFilters} />
            <IconButton
              icon="notifications-outline"
              onPress={openNotifications}
              showDot={hasUnseenNotifications}
            />
          </View>
        </View>
        <View style={styles.tabRow}>
          {(["forYou", "recent"] as const).map((tabKey) => (
            <Pressable
              key={tabKey}
              onPress={() => setActiveTab(tabKey)}
              style={[styles.tab, activeTab === tabKey && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, activeTab === tabKey && styles.tabLabelActive]}>
                {tabKey === "forYou" ? copy.tabs.forYou : copy.tabs.recent}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {currentProfile ? (
        <ProfileCard profile={currentProfile} onLike={handleLike} onSkip={handleSkip} showActions={canInteract} />
      ) : (
        <EmptyFeed
          onIncreaseRadius={handleIncreaseRadius}
          onResetFilters={handleResetFilters}
          onRetry={refetch}
          onInviteFriends={handleInviteFriends}
          onOpenFilters={openFilters}
          onOpenNotifications={openNotifications}
          showChrome={false}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: "#fff"
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
    flexGrow: 1,
    backgroundColor: "#fff"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  headerContainer: {
    backgroundColor: "#fff",
    paddingBottom: 12
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#050709",
    letterSpacing: 1
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  tab: {
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1.2,
    borderColor: BORDER_COLOR,
    backgroundColor: "#f8f9fb"
  },
  tabActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    shadowColor: ACCENT,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 3
  },
  tabLabel: {
    fontWeight: "600",
    color: "#5e626a"
  },
  tabLabelActive: {
    color: "#fff"
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  }
});

const IconButton = ({
  icon,
  onPress,
  showDot = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  showDot?: boolean;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [iconStyles.button, pressed && iconStyles.buttonPressed]}>
    <Ionicons name={icon} size={24} color="#9aa0a9" />
    {showDot ? <View style={iconStyles.dot} /> : null}
  </Pressable>
);

const iconStyles = StyleSheet.create({
  button: {
    padding: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonPressed: {
    opacity: 0.55
  },
  dot: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT
  }
});

export default DiscoveryScreen;
