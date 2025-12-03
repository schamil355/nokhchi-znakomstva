import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useNotificationsStore, type NotificationItem } from "../state/notificationsStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl, PROFILE_BUCKET } from "../lib/storage";
import { useAuthStore } from "../state/authStore";

const brandText = "#1f1f25";
const secondaryText = "#6f7582";

type RelativeCopy = {
  seconds: string;
  minute: string;
  minutes: (value: number) => string;
  hour: string;
  hours: (value: number) => string;
  day: string;
  days: (value: number) => string;
  week: string;
  weeks: (value: number) => string;
  month: string;
  months: (value: number) => string;
};

type CopyShape = {
  headerTitle: string;
  bannerTitle: string;
  bannerSubtitle: string;
  activate: string;
  noDetails: string;
  emptyTitle: string;
  emptyText: string;
  buttonLabel: string;
  relative: RelativeCopy;
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    headerTitle: "Notifications",
    bannerTitle: "Notifications are turned off.",
    bannerSubtitle: "Enable push notifications to stay updated on likes, matches, and messages.",
    activate: "Enable now",
    noDetails: "No additional details available.",
    emptyTitle: "No notifications",
    emptyText: "When you get likes, matches, or updates, they will appear here.",
    buttonLabel: "View",
    relative: {
      seconds: "A few seconds ago",
      minute: "1 minute ago",
      minutes: (value) => `${value} minutes ago`,
      hour: "1 hour ago",
      hours: (value) => `${value} hours ago`,
      day: "1 day ago",
      days: (value) => `${value} days ago`,
      week: "1 week ago",
      weeks: (value) => `${value} weeks ago`,
      month: "1 month ago",
      months: (value) => `${value} months ago`,
    },
  },
  de: {
    headerTitle: "Benachrichtigungen",
    bannerTitle: "Benachrichtigungen sind ausgeschaltet.",
    bannerSubtitle: "Schalte Push-Benachrichtigungen ein, um immer informiert zu bleiben.",
    activate: "Jetzt aktivieren",
    noDetails: "Keine weiteren Details verfügbar.",
    emptyTitle: "Keine Benachrichtigungen",
    emptyText: "Sobald du Likes, Matches oder Hinweise erhältst, erscheinen sie hier.",
    buttonLabel: "Anzeigen",
    relative: {
      seconds: "Vor wenigen Sekunden",
      minute: "Vor 1 Minute",
      minutes: (value) => `Vor ${value} Minuten`,
      hour: "Vor 1 Stunde",
      hours: (value) => `Vor ${value} Stunden`,
      day: "Vor 1 Tag",
      days: (value) => `Vor ${value} Tagen`,
      week: "Vor 1 Woche",
      weeks: (value) => `Vor ${value} Wochen`,
      month: "Vor 1 Monat",
      months: (value) => `Vor ${value} Monaten`,
    },
  },
  fr: {
    headerTitle: "Notifications",
    bannerTitle: "Les notifications sont désactivées.",
    bannerSubtitle: "Active les notifications push pour rester informé.",
    activate: "Activer maintenant",
    noDetails: "Pas plus de détails.",
    emptyTitle: "Aucune notification",
    emptyText: "Quand tu recevras des likes ou matches, tu les verras ici.",
    buttonLabel: "Voir",
    relative: {
      seconds: "Il y a quelques secondes",
      minute: "Il y a 1 minute",
      minutes: (value) => `Il y a ${value} minutes`,
      hour: "Il y a 1 heure",
      hours: (value) => `Il y a ${value} heures`,
      day: "Il y a 1 jour",
      days: (value) => `Il y a ${value} jours`,
      week: "Il y a 1 semaine",
      weeks: (value) => `Il y a ${value} semaines`,
      month: "Il y a 1 mois",
      months: (value) => `Il y a ${value} mois`,
    },
  },
  ru: {
    headerTitle: "Уведомления",
    bannerTitle: "Уведомления выключены.",
    bannerSubtitle: "Включи push, чтобы не пропускать лайки и сообщения.",
    activate: "Включить",
    noDetails: "Нет дополнительных сведений.",
    emptyTitle: "Нет уведомлений",
    emptyText: "Когда появятся лайки, матчи или подсказки, они появятся здесь.",
    buttonLabel: "Открыть",
    relative: {
      seconds: "Несколько секунд назад",
      minute: "Минуту назад",
      minutes: (value) => `${value} мин назад`,
      hour: "Час назад",
      hours: (value) => `${value} ч назад`,
      day: "День назад",
      days: (value) => `${value} дн назад`,
      week: "Неделю назад",
      weeks: (value) => `${value} нед назад`,
      month: "Месяц назад",
      months: (value) => `${value} мес назад`,
    },
  },
};

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const notifications = useNotificationsStore((state) => state.items);
  const markSeen = useNotificationsStore((state) => state.markSeen);
  const sessionUserId = useAuthStore((state) => state.session?.user.id ?? null);
  const copy = useLocalizedCopy(translations);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      ),
    [notifications]
  );
  const notificationsEnabled = permissionStatus === "granted" || permissionStatus === "provisional";
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [avatarCache, setAvatarCache] = useState<Record<string, string | null>>({});

  const refreshPermissionStatus = useCallback(async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      setPermissionStatus(settings.status);
    } catch (error) {
      console.warn("[NotificationsScreen] failed to fetch permissions", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      markSeen();
      void Notifications.setBadgeCountAsync(0);
      refreshPermissionStatus();
    }, [markSeen, refreshPermissionStatus])
  );

  useEffect(() => {
    setAvatarCache((prev) => {
      const next = { ...prev };
      sortedNotifications.forEach((entry) => {
        if (entry.data?.avatarUrl && !next[entry.id]) {
          next[entry.id] = entry.data.avatarUrl;
        }
      });
      return next;
    });
  }, [sortedNotifications]);

  useEffect(() => {
    if (!sessionUserId) {
      return;
    }
    const pending = sortedNotifications.filter((entry) => {
      const isMatch =
        entry.data?.type === "match.new" || entry.data?.match_id || entry.data?.matchId;
      const matchId = entry.data?.match_id ?? entry.data?.matchId;
      return isMatch && matchId && !avatarCache[entry.id];
    });
    if (!pending.length) {
      return;
    }
    let cancelled = false;
    const loadAvatars = async () => {
      for (const entry of pending) {
        const matchId = entry.data?.match_id ?? entry.data?.matchId;
        if (!matchId) {
          continue;
        }
        try {
          let otherUserId = entry.data?.otherUserId ?? entry.data?.liker_id ?? null;
          if (!otherUserId && matchId) {
            const { data: matchRow, error: matchError } = await supabase
              .from("matches_v")
              .select("user_a,user_b")
              .eq("id", matchId)
              .maybeSingle();
            if (matchError || !matchRow) {
              continue;
            }
            if (matchRow.user_a === sessionUserId) {
              otherUserId = matchRow.user_b;
            } else if (matchRow.user_b === sessionUserId) {
              otherUserId = matchRow.user_a;
            } else {
              otherUserId = matchRow.user_a ?? matchRow.user_b ?? null;
            }
          }
          if (!otherUserId) {
            continue;
          }
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("primary_photo_path, photos")
            .eq("id", otherUserId)
            .maybeSingle();
          let resolved: string | null = null;
          if (profileRow?.primary_photo_path) {
            try {
              resolved = await getPhotoUrl(profileRow.primary_photo_path, supabase, PROFILE_BUCKET);
            } catch {
              resolved = null;
            }
          }
          if (!resolved && Array.isArray(profileRow?.photos) && profileRow.photos.length > 0) {
            const first = profileRow.photos[0];
            resolved = first?.url ?? null;
          }
          if (cancelled) {
            return;
          }
          setAvatarCache((prev) =>
            prev[entry.id]
              ? prev
              : {
                  ...prev,
                  [entry.id]: resolved
                }
          );
        } catch (error) {
          console.warn("[NotificationsScreen] failed to load match avatar", error);
        }
      }
    };
    loadAvatars();
    return () => {
      cancelled = true;
    };
  }, [avatarCache, sessionUserId, sortedNotifications, supabase]);

  const handleActivate = async () => {
    if (notificationsEnabled) {
      return;
    }

    const scheduleRefresh = () => {
      setTimeout(() => {
        refreshPermissionStatus().catch(() => {});
      }, 1000);
    };

    if (Platform.OS === "ios") {
      const url = "app-settings:";
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        scheduleRefresh();
      }
      return;
    }

    const url = "app-settings:";
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
    scheduleRefresh();
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) {
      return copy.relative.seconds;
    }
    if (minutes === 1) {
      return copy.relative.minute;
    }
    if (minutes < 60) {
      return copy.relative.minutes(minutes);
    }
    const hours = Math.floor(minutes / 60);
    if (hours === 1) {
      return copy.relative.hour;
    }
    if (hours < 24) {
      return copy.relative.hours(hours);
    }
    const days = Math.floor(hours / 24);
    if (days === 1) {
      return copy.relative.day;
    }
    if (days < 7) {
      return copy.relative.days(days);
    }
    const weeks = Math.floor(days / 7);
    if (weeks === 1) {
      return copy.relative.week;
    }
    if (weeks < 5) {
      return copy.relative.weeks(weeks);
    }
    const months = Math.floor(days / 30);
    if (months === 1) {
      return copy.relative.month;
    }
    return copy.relative.months(months);
  };

  const handleNotificationPress = (item: NotificationItem) => {
    const isMatch = item.data?.type === "match.new" || item.data?.match_id || item.data?.matchId;
    const isLike = item.data?.type === "like.received" || item.data?.liker_id;
    if (isMatch || isLike) {
      const parentNav: any = navigation.getParent?.();
      const rootNav: any = parentNav?.getParent?.() ?? parentNav ?? navigation;
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      if (rootNav?.navigate) {
        rootNav.navigate("Main" as never, { screen: "Matches" } as never);
      } else {
        navigation.navigate("Matches" as never);
      }
      return;
    }
    Alert.alert(item.title, item.body ?? copy.noDetails);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={handleBack} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={28} color={brandText} />
        </Pressable>
        <Text style={styles.headerTitle}>{copy.headerTitle}</Text>
      </View>

      {!notificationsEnabled && (
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={styles.bannerIcon}>
              <Ionicons name="notifications-off-outline" size={26} color="#7c8594" />
            </View>
          <Text style={styles.bannerTitle}>{copy.bannerTitle}</Text>
          </View>
          <Text style={styles.bannerSubtitle}>{copy.bannerSubtitle}</Text>
          <Pressable style={styles.activateButton} onPress={handleActivate}>
            <Text style={styles.activateButtonText}>{copy.activate}</Text>
          </Pressable>
        </View>
      )}

      {sortedNotifications.length === 0 ? (
        <View style={styles.emptyList}>
          <View style={styles.emptyIconWrapper}>
            <Ionicons name="notifications-off-outline" size={34} color={secondaryText} />
          </View>
          <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
          <Text style={styles.emptyText}>{copy.emptyText}</Text>
        </View>
      ) : (
        <View style={styles.section}>
          {sortedNotifications.map((entry) => {
            const avatarUri =
              avatarCache[entry.id] ??
              (typeof entry.data?.avatarUrl === "string" && entry.data.avatarUrl.length > 0
                ? entry.data.avatarUrl
                : null);
            return (
              <Pressable key={entry.id} style={styles.itemRow} onPress={() => handleNotificationPress(entry)}>
                <View style={[styles.avatarWrapper, !avatarUri && styles.avatarPlaceholder]}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="notifications" size={24} color="#b6bac2" />
                  )}
                </View>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{entry.title}</Text>
                {!!entry.body && <Text style={styles.itemBodyText}>{entry.body}</Text>}
                <Text style={styles.itemTime}>{formatRelativeTime(entry.receivedAt)}</Text>
              </View>
              <Pressable style={styles.itemButton} onPress={() => handleNotificationPress(entry)}>
                <Text style={styles.itemButtonText}>{copy.buttonLabel}</Text>
              </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: brandText
  },
  banner: {
    backgroundColor: "#f7f9fc",
    borderRadius: 28,
    padding: 24,
    marginBottom: 28
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center"
  },
  bannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: brandText
  },
  bannerSubtitle: {
    fontSize: 14,
    color: secondaryText,
    lineHeight: 20,
    marginBottom: 20
  },
  activateButton: {
    backgroundColor: "#0d6e4f",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center"
  },
  activateButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  section: {
    marginBottom: 30
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12
  },
  avatarWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    marginRight: 14
  },
  avatarPlaceholder: {
    backgroundColor: "#f3f4f7",
    borderWidth: 1,
    borderColor: "#e1e3e8",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  itemBody: {
    flex: 1
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: brandText,
    marginBottom: 4
  },
  itemBodyText: {
    fontSize: 14,
    color: secondaryText,
    marginBottom: 4
  },
  itemTime: {
    fontSize: 13,
    color: secondaryText
  },
  itemButton: {
    backgroundColor: "#f1f1f3",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20
  },
  itemButtonText: {
    color: brandText,
    fontWeight: "600"
  },
  emptyList: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  emptyIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#f4f6f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: brandText,
    marginBottom: 6
  },
  emptyText: {
    fontSize: 14,
    color: secondaryText,
    textAlign: "center",
    lineHeight: 20
  }
});

export default NotificationsScreen;
