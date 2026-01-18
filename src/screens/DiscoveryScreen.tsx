import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions, LayoutChangeEvent } from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDiscoveryFeed, useRecentProfiles } from "../hooks/useDiscoveryFeed";
import { sendLike, skipProfile } from "../services/discoveryService";
import { ensureDirectConversation } from "../services/directChatService";
import { reportUser } from "../services/moderationService";
import { useAuthStore } from "../state/authStore";
import { usePreferencesStore } from "../state/preferencesStore";
import { Profile } from "../types";
import ProfileCard from "../components/ProfileCard";
import EmptyFeed from "../components/EmptyFeed";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationsStore } from "../state/notificationsStore";
import * as Notifications from "expo-notifications";
import { LinearGradient } from "expo-linear-gradient";
import { useRevenueCat } from "../hooks/useRevenueCat";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { calculateCompassAlignment } from "../lib/matchEngine";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { track } from "../lib/analytics";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const ACCENT = PALETTE.gold;
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
  actions: {
    directChat: string;
    directChatFailed: string;
    report: string;
    reportTitle: string;
    reportBody: string;
    reportOnly: string;
    reportCancel: string;
    reportSuccess: string;
    reportFailed: string;
  };
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    tabs: { forYou: "For you", recent: "Recently verified" },
    matchTitle: "New connection!",
    matchBody: (name) => `You and ${name} are now connected.`,
    matchAlertBody: "A mutual introduction was created. You can start chatting now.",
    fallbackName: "someone",
    errors: {
      title: "Error",
      likeFallback: "We couldn't send your request.",
      skipFallback: "Couldn't skip this profile."
    },
    actions: {
      directChat: "Direct intro",
      directChatFailed: "Couldn't start a direct intro.",
      report: "Report",
      reportTitle: "Report this profile?",
      reportBody: "We will review this report.",
      reportOnly: "Report",
      reportCancel: "Cancel",
      reportSuccess: "Report received. Thank you.",
      reportFailed: "Report failed. Please try again."
    },
  },
  de: {
    tabs: { forYou: "Für dich", recent: "Kürzlich verifiziert" },
    matchTitle: "Neue Verbindung!",
    matchBody: (name) => `Du und ${name} seid jetzt verbunden.`,
    matchAlertBody: "Es gibt eine gegenseitige Einführung. Ihr könnt jetzt chatten.",
    fallbackName: "jemand",
    errors: {
      title: "Fehler",
      likeFallback: "Deine Anfrage konnte nicht gesendet werden.",
      skipFallback: "Profil konnte nicht übersprungen werden."
    },
    actions: {
      directChat: "Direktkontakt",
      directChatFailed: "Direktkontakt konnte nicht gestartet werden.",
      report: "Melden",
      reportTitle: "Profil melden?",
      reportBody: "Wir prüfen die Meldung.",
      reportOnly: "Melden",
      reportCancel: "Abbrechen",
      reportSuccess: "Meldung erhalten. Danke!",
      reportFailed: "Meldung fehlgeschlagen."
    },
  },
  fr: {
    tabs: { forYou: "Pour toi", recent: "Récemment vérifiés" },
    matchTitle: "Nouvelle connexion !",
    matchBody: (name) => `Toi et ${name} êtes désormais connectés.`,
    matchAlertBody: "Une introduction mutuelle a été créée. Tu peux discuter maintenant.",
    fallbackName: "quelqu'un",
    errors: {
      title: "Erreur",
      likeFallback: "Impossible d'envoyer ta demande.",
      skipFallback: "Impossible d'ignorer ce profil."
    },
    actions: {
      directChat: "Contact direct",
      directChatFailed: "Impossible d'ouvrir le contact direct.",
      report: "Signaler",
      reportTitle: "Signaler ce profil ?",
      reportBody: "Nous examinerons ce signalement.",
      reportOnly: "Signaler",
      reportCancel: "Annuler",
      reportSuccess: "Signalement reçu. Merci.",
      reportFailed: "Échec du signalement. Réessaie."
    },
  },
  ru: {
    tabs: { forYou: "Для тебя", recent: "Недавно проверены" },
    matchTitle: "Новая связь!",
    matchBody: (name) => `Вы и ${name} теперь на связи.`,
    matchAlertBody: "Создана взаимная связь. Можно начинать диалог.",
    fallbackName: "кто-то",
    errors: {
      title: "Ошибка",
      likeFallback: "Не удалось отправить запрос.",
      skipFallback: "Не удалось пропустить профиль."
    },
    actions: {
      directChat: "Прямая связь",
      directChatFailed: "Не удалось начать прямую связь.",
      report: "Пожаловаться",
      reportTitle: "Пожаловаться на профиль?",
      reportBody: "Мы рассмотрим жалобу.",
      reportOnly: "Пожаловаться",
      reportCancel: "Отмена",
      reportSuccess: "Жалоба отправлена. Спасибо.",
      reportFailed: "Не удалось отправить жалобу."
    },
  },
};

  const copy = useLocalizedCopy(translations);
  const errorCopy = useErrorCopy();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  const {
    data: discoveryProfiles = [],
    isLoading: isDiscoveryLoading,
    refetch: refetchDiscovery,
    isRefetching: isDiscoveryRefetching
  } = useDiscoveryFeed();
  const [processing, setProcessing] = useState(false);
  const [isStartingDirect, setIsStartingDirect] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"forYou" | "recent">("forYou");
  const [queues, setQueues] = useState<{ forYou: Profile[]; recent: Profile[] }>({
    forYou: [],
    recent: []
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);

  const {
    data: recentProfiles = [],
    isLoading: isRecentLoading,
    refetch: refetchRecent,
    isRefetching: isRecentRefetching
  } = useRecentProfiles(activeTab === "recent");
  const session = useAuthStore((state) => state.session);
  const viewerProfile = useAuthStore((state) => state.profile);
  const isPremium = useAuthStore((state) => state.profile?.isPremium ?? false);
  const { isPro } = useRevenueCat({ loadOfferings: false });
  const hasPremiumAccess = isPremium || isPro;
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
  const cardHeight = React.useMemo(() => {
    const availableHeight = height - insets.top - insets.bottom - tabBarHeight - headerHeight;
    const target = availableHeight > 0 ? availableHeight - 12 : width * 1.1;
    return Math.round(Math.max(260, target));
  }, [height, insets.bottom, insets.top, tabBarHeight, headerHeight, width]);

  const handleHeaderLayout = React.useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setHeaderHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  }, []);

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
  const compassSummary =
    viewerProfile && currentProfile
      ? calculateCompassAlignment(viewerProfile, currentProfile)
      : null;


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
      logError(error, "send-like");
      Alert.alert(copy.errors.title, getErrorMessage(error, errorCopy, copy.errors.likeFallback));
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
      logError(error, "skip-profile");
      Alert.alert(copy.errors.title, getErrorMessage(error, errorCopy, copy.errors.skipFallback));
    } finally {
      setProcessing(false);
    }
  };

  const handleDirectChat = useCallback(async () => {
    if (!session?.user?.id || !currentProfile?.userId || isStartingDirect) {
      return;
    }
    if (!hasPremiumAccess) {
      const parentNav: any = (navigation as any).getParent?.() ?? navigation;
      const rootNav: any = parentNav?.getParent?.() ?? parentNav;
      const navigateToUpsell = rootNav?.navigate ?? navigation?.navigate;
      if (typeof navigateToUpsell === "function") {
        navigateToUpsell("PremiumUpsell");
      }
      return;
    }
    setIsStartingDirect(true);
    try {
      const conversationId = await ensureDirectConversation(session.user.id, currentProfile.userId);
      const parentNav: any = (navigation as any).getParent?.() ?? navigation;
      const rootNav: any = parentNav?.getParent?.() ?? parentNav;
      const navigateToChat = rootNav?.navigate ?? navigation?.navigate;
      if (!conversationId || typeof navigateToChat !== "function") {
        throw new Error("Navigation unavailable");
      }
      navigateToChat("DirectChat", { conversationId, otherUserId: currentProfile.userId });
    } catch (error) {
      console.warn("Failed to open direct chat from discovery", error);
      Alert.alert(copy.actions.directChatFailed);
    } finally {
      setIsStartingDirect(false);
    }
  }, [
    copy.actions.directChatFailed,
    currentProfile?.userId,
    hasPremiumAccess,
    isStartingDirect,
    navigation,
    session?.user?.id
  ]);

  const showFeedback = useCallback((title: string, message?: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(message ? `${title}\n${message}` : title);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const runReport = useCallback(
    async () => {
      if (!session?.user?.id || !currentProfile?.userId || isModerating) {
        return;
      }
      setIsModerating(true);
      try {
        await reportUser(session.user.id, currentProfile.userId, "abuse");
        await track("report_profile", { targetId: currentProfile.userId, source: "discovery", action: "report" });
        showFeedback(copy.actions.reportSuccess);
      } catch (error) {
        console.warn("Failed to report user from discovery", error);
        showFeedback(copy.actions.reportFailed);
      } finally {
        setIsModerating(false);
      }
    },
    [
      copy.actions.reportFailed,
      copy.actions.reportSuccess,
      currentProfile?.userId,
      isModerating,
      session?.user?.id,
      showFeedback
    ]
  );

  const handleReportProfile = useCallback(() => {
    if (!session?.user?.id || !currentProfile?.userId || isModerating) {
      return;
    }
    if (Platform.OS === "web") {
      setReportSheetVisible(true);
      return;
    }
    Alert.alert(copy.actions.reportTitle, copy.actions.reportBody, [
      { text: copy.actions.reportCancel, style: "cancel" },
      {
        text: copy.actions.reportOnly,
        style: "default",
        onPress: () => {
          void runReport();
        }
      }
    ]);
  }, [
    copy.actions.reportBody,
    copy.actions.reportCancel,
    copy.actions.reportOnly,
    copy.actions.reportTitle,
    currentProfile?.userId,
    isModerating,
    runReport,
    session?.user?.id
  ]);

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

  const openFilters = useCallback(() => {
    const parentNav: any = (navigation as any).getParent?.() ?? navigation;
    const rootNav: any = parentNav?.getParent?.() ?? parentNav;
    if (rootNav?.navigate) {
      rootNav.navigate("Filters", { isModal: true });
    } else {
      navigation.navigate("Filters" as never);
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

  useEffect(() => {
    if (activeTab === "recent") {
      setActiveTab("forYou");
    }
  }, [activeTab]);

  // Sign-out Button (temporär) entfernt

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]} topPadding={0}>
        {Platform.OS === "web" ? (
          <Modal
            transparent
            animationType="fade"
            visible={reportSheetVisible}
            onRequestClose={() => setReportSheetVisible(false)}
          >
            <View style={styles.reportBackdrop}>
              <Pressable style={styles.reportBackdropTouchable} onPress={() => setReportSheetVisible(false)} />
              <View style={styles.reportSheet}>
                <Text style={styles.reportTitle}>{copy.actions.reportTitle}</Text>
                <Text style={styles.reportBody}>{copy.actions.reportBody}</Text>
                <View style={styles.reportActions}>
                  <Pressable
                    style={[styles.reportButton, styles.reportButtonGhost]}
                    onPress={() => setReportSheetVisible(false)}
                    disabled={isModerating}
                  >
                    <Text style={styles.reportButtonText}>{copy.actions.reportCancel}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.reportButton}
                    onPress={() => {
                      setReportSheetVisible(false);
                      void runReport();
                    }}
                    disabled={isModerating}
                  >
                    <Text style={styles.reportButtonText}>{copy.actions.reportOnly}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        ) : null}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(32, insets.bottom + tabBarHeight + 24) }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={PALETTE.gold}
              colors={[PALETTE.gold]}
            />
          }
        >
          <View style={styles.headerContainer} onLayout={handleHeaderLayout}>
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
              {(["forYou"] as const).map((tabKey) => (
                <Pressable
                  key={tabKey}
                  onPress={() => setActiveTab(tabKey)}
                  style={({ pressed }) => [styles.tabButton, pressed && styles.tabButtonPressed]}
                >
                  <LinearGradient
                    colors={[PALETTE.gold, "#8b6c2a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tabInner}
                  >
                    <Text style={styles.tabLabelPrimary}>
                      {tabKey === "forYou" ? copy.tabs.forYou : copy.tabs.recent}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
          </View>

          {isLoading && !visibleProfiles.length ? (
            <View style={[styles.center, styles.loader]}>
              <ActivityIndicator size="large" color={PALETTE.gold} />
            </View>
          ) : currentProfile ? (
            <ProfileCard
              profile={currentProfile}
              onLike={handleLike}
              onSkip={handleSkip}
              onDirectChat={handleDirectChat}
              onReport={handleReportProfile}
              directChatDisabled={isStartingDirect}
              reportDisabled={isModerating}
              showActions={canInteract}
              cardHeight={cardHeight}
              compassSummary={
                compassSummary && compassSummary.total > 0
                  ? { matches: compassSummary.matches, total: compassSummary.total }
                  : undefined
              }
            />
          ) : (
            <EmptyFeed
              onIncreaseRadius={handleIncreaseRadius}
              onResetFilters={handleResetFilters}
              onRetry={refetch}
              onOpenFilters={openFilters}
              onOpenNotifications={openNotifications}
              showChrome={false}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  scroll: {
    backgroundColor: "transparent"
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 32,
    flexGrow: 1,
    backgroundColor: "transparent"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  loader: {
    minHeight: 320
  },
  headerContainer: {
    backgroundColor: "transparent",
    paddingBottom: 6
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
    color: PALETTE.sand,
    letterSpacing: 1
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6
  },
  tabButton: {
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    backgroundColor: "transparent",
    alignSelf: "flex-start"
  },
  tabButtonPressed: {
    opacity: 0.9
  },
  tabInner: {
    paddingVertical: 7,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  tabLabelPrimary: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  reportBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  reportBackdropTouchable: {
    ...StyleSheet.absoluteFillObject
  },
  reportSheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.4)",
    backgroundColor: "#0b1a12",
    padding: 18,
    gap: 12
  },
  reportTitle: {
    color: PALETTE.sand,
    fontSize: 16,
    fontWeight: "700"
  },
  reportBody: {
    color: "rgba(242,231,215,0.78)",
    fontSize: 13,
    lineHeight: 18
  },
  reportActions: {
    gap: 10
  },
  reportButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217,192,143,0.16)",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.4)"
  },
  reportButtonGhost: {
    backgroundColor: "transparent"
  },
  reportButtonText: {
    color: PALETTE.sand,
    fontWeight: "700",
    fontSize: 14
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
    <Ionicons name={icon} size={24} color={PALETTE.sand} />
    {showDot ? <View style={iconStyles.dot} /> : null}
  </Pressable>
);

const iconStyles = StyleSheet.create({
  button: {
    padding: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0
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
