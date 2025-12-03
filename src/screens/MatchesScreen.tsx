import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMatches } from "../hooks/useMatches";
import { useAuthStore } from "../state/authStore";
import { Match } from "../types";
import { useChatStore } from "../state/chatStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl } from "../lib/storage";
import { fetchProfile } from "../services/profileService";
import { useNotificationsStore } from "../state/notificationsStore";

const brandGreen = "#0d6e4f";
const MATCH_AVATAR_CACHE_KEY = "matches_avatar_cache";
const AVATAR_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for refreshing signed URLs

type CopyShape = {
  tabLabel: string;
  cardTitle: string;
  sectionTitle: string;
  matchLabel: (id: string) => string;
  lastActive: (timestamp: string) => string;
  justNow: string;
  emptyTitle: string;
  emptySubtitle: string;
  ctaFilters: string;
  messagesEmpty: string;
  statusRead?: string;
  statusNew?: string;
  messageLabel?: string;
  statusSent?: string;
};

const translations: Record<"en" | "de" | "fr" | "ru", CopyShape> = {
  en: {
    tabLabel: "Matches",
    cardTitle: "Your matches",
    sectionTitle: "Messages",
    matchLabel: (id) => `Match #${id}`,
    lastActive: (timestamp) => `Last active ${timestamp}`,
    justNow: "just now",
    emptyTitle: "No matches yet!",
    emptySubtitle: "Expand your filters to discover more people near you.",
    ctaFilters: "Adjust filters",
    messagesEmpty: "No conversations yet.",
    statusRead: "read",
    statusNew: "new",
    messageLabel: "Message",
    statusSent: "sent"
  },
  de: {
    tabLabel: "Matches",
    cardTitle: "Deine Matches",
    sectionTitle: "Nachrichten",
    matchLabel: (id) => `Match #${id}`,
    lastActive: (timestamp) => `Zuletzt aktiv ${timestamp}`,
    justNow: "gerade eben",
    emptyTitle: "Keine Matches bis jetzt!",
    emptySubtitle:
      "Erweitere deine Suche in den Filtereinstellungen, um einen potenziellen Match in deiner Nähe zu finden!",
    ctaFilters: "Filtereinstellungen",
    messagesEmpty: "Noch keine Nachrichten vorhanden.",
    statusRead: "gelesen",
    statusNew: "neu",
    messageLabel: "Message",
    statusSent: "gesendet"
  },
  fr: {
    tabLabel: "Matches",
    cardTitle: "Tes matches",
    sectionTitle: "Messages",
    matchLabel: (id) => `Match #${id}`,
    lastActive: (timestamp) => `Dernière activité ${timestamp}`,
    justNow: "à l'instant",
    emptyTitle: "Pas encore de match !",
    emptySubtitle: "Étends ta recherche dans les filtres pour trouver des matches proches.",
    ctaFilters: "Filtres",
    messagesEmpty: "Aucune conversation pour le moment.",
    statusRead: "lu",
    statusNew: "nouveau",
    messageLabel: "Message",
    statusSent: "envoyé"
  },
  ru: {
    tabLabel: "Матчи",
    cardTitle: "Твои матчи",
    sectionTitle: "Сообщения",
    matchLabel: (id) => `Матч #${id}`,
    lastActive: (timestamp) => `Активен ${timestamp}`,
    justNow: "только что",
    emptyTitle: "Пока нет матчей!",
    emptySubtitle: "Расширь поиск в фильтрах, чтобы найти подходящих людей рядом.",
    ctaFilters: "Настроить фильтры",
    messagesEmpty: "Пока нет переписок.",
    statusRead: "прочитано",
    statusNew: "новое",
    messageLabel: "Message",
    statusSent: "отправлено"
  },
};

const MatchesScreen = () => {
  const { data: matches = [], isLoading, refetch: refetchMatches } = useMatches();
  const session = useAuthStore((state) => state.session);
  const navigation = useNavigation<any>();
  const unread = useChatStore((state) => state.unreadCounts);
  const setUnread = useChatStore((state) => state.setUnread);
  const copy = useLocalizedCopy(translations);
  const [avatarCache, setAvatarCache] = useState<Record<string, { url: string | null; ts: number }>>({});
  const [avatarCacheLoaded, setAvatarCacheLoaded] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const notifications = useNotificationsStore((state) => state.items);
  const [lastMessages, setLastMessages] = useState<
    Record<string, { content: string; senderId: string; createdAt: string; readAt?: string | null } | null>
  >({});
  const matchIdsKey = matches.map((m) => m.id).join(",");

  useFocusEffect(
    useCallback(() => {
      refetchMatches();
    }, [refetchMatches])
  );

  const formatLastActive = (timestamp: string | null | undefined) => {
    if (!timestamp) {
      return copy.justNow;
    }
    return copy.lastActive(new Date(timestamp).toLocaleString());
  };

  useEffect(() => {
    const loadAvatarCache = async () => {
      try {
        const raw = await AsyncStorage.getItem(MATCH_AVATAR_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            const normalized = Object.entries(parsed).reduce<Record<string, { url: string | null; ts: number }>>(
              (acc, [matchId, value]) => {
                if (value && typeof value === "object" && "url" in (value as any) && "ts" in (value as any)) {
                  acc[matchId] = value as { url: string | null; ts: number };
                } else {
                  acc[matchId] = { url: (value as any) ?? null, ts: 0 };
                }
                return acc;
              },
              {}
            );
            setAvatarCache(normalized);
          }
        }
      } catch {
        // ignore corrupt cache
      } finally {
        setAvatarCacheLoaded(true);
      }
    };
    loadAvatarCache();
  }, []);

  useEffect(() => {
    if (!avatarCacheLoaded) return;
    AsyncStorage.setItem(MATCH_AVATAR_CACHE_KEY, JSON.stringify(avatarCache)).catch(() => undefined);
  }, [avatarCache, avatarCacheLoaded]);

  const renderMatch = ({ item, showSubtitle = true }: { item: Match; showSubtitle?: boolean }) => {
    const otherParticipant =
      item.participants.find((participant) => participant !== session?.user.id) ?? item.participants[0];
    const title = item.otherDisplayName ?? (showSubtitle ? copy.matchLabel(item.id.slice(0, 6)) : "");
    const cachedEntry = Object.prototype.hasOwnProperty.call(avatarCache, item.id) ? avatarCache[item.id] : undefined;
    const avatarUri = cachedEntry?.url ?? item.previewPhotoUrl ?? null;
    const shouldShowText = Boolean(title);
    return (
      <Pressable
        style={styles.matchRow}
        onPress={() => {
          navigation.navigate("Chat", { matchId: item.id, participantId: otherParticipant });
        }}
      >
        {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <View style={styles.avatarPlaceholder} />}
        {shouldShowText ? (
          <View style={{ flex: 1 }}>
            <Text style={styles.matchTitle}>{title}</Text>
            {showSubtitle && <Text style={styles.matchSubtitle}>{formatLastActive(item.lastMessageAt)}</Text>}
          </View>
        ) : null}
        {unread[item.id] ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread[item.id]}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderMessageRow = (item: Match) => {
    const otherParticipant =
      item.participants.find((participant) => participant !== session?.user.id) ?? item.participants[0];
    const cachedEntry = Object.prototype.hasOwnProperty.call(avatarCache, item.id) ? avatarCache[item.id] : undefined;
    const avatarUri = cachedEntry?.url ?? item.previewPhotoUrl ?? null;
    const title = item.otherDisplayName || "Match";
    const lastMessage = lastMessages[item.id];
    const snippet = lastMessage?.content?.trim() || copy.messagesEmpty;
    const isUnread =
      Boolean(unread[item.id]) ||
      Boolean(lastMessage && lastMessage.senderId !== session?.user?.id && !lastMessage.readAt);
    const isOwnLast = lastMessage?.senderId === session?.user?.id;
    const isRead = Boolean(lastMessage?.readAt);
    const statusText = (() => {
      if (isUnread) return copy.statusNew ?? "new";
      if (isOwnLast && isRead) return copy.statusRead ?? "read";
      if (isOwnLast && !isRead) return copy.statusSent ?? "sent";
      return "";
    })();
    const lastActive = item.lastMessageAt ? new Date(item.lastMessageAt).getTime() : 0;
    const now = Date.now();
    const online = lastActive && now - lastActive < 5 * 60 * 1000;

    return (
      <Pressable
        key={`${item.id}-message`}
        style={styles.messageCard}
        onPress={() => {
          setUnread(item.id, 0);
          setLastMessages((prev) => ({
            ...prev,
            [item.id]: prev[item.id]
              ? { ...prev[item.id], readAt: new Date().toISOString() }
              : prev[item.id]
          }));
          navigation.navigate("Chat", { matchId: item.id, participantId: otherParticipant });
        }}
      >
        <View style={styles.messageAvatarWrapper}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.messageAvatar} />
          ) : (
            <View style={styles.messageAvatarPlaceholder} />
          )}
          <View
            style={[styles.statusDot, online ? styles.statusDotActive : styles.statusDotOffline]}
          />
        </View>
        <View style={styles.messageContent}>
          <Text style={[styles.messageName, isUnread && styles.messageNameUnread]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.messagePreview, isUnread && styles.messagePreviewUnread]} numberOfLines={1}>
            {snippet}
          </Text>
        </View>
        <View style={styles.messageMeta}>
          {isUnread ? (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>1</Text>
            </View>
          ) : statusText ? (
            <Text style={[styles.messageStatus, isUnread && styles.messageStatusUnread]} numberOfLines={1}>
              {statusText}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const hasMatches = matches.length > 0;
  const messageThreads = matches.filter((match) => Boolean(match.lastMessageAt));

  useEffect(() => {
    // Seed cache with existing previewPhotoUrl
    matches.forEach((match) => {
      const existing = Object.prototype.hasOwnProperty.call(avatarCache, match.id) ? avatarCache[match.id] : undefined;
      if (match.previewPhotoUrl && (!existing || existing.url === null)) {
        setAvatarCache((prev) => ({
          ...prev,
          [match.id]: { url: match.previewPhotoUrl ?? null, ts: Date.now() }
        }));
      }
    });
  }, [matches, avatarCache]);

  useFocusEffect(
    useMemo(
      () => () => {
        let cancelled = false;
        const refreshAvatars = async () => {
          for (const match of matches) {
            const other =
              match.participants.find((p) => p !== session?.user?.id) ?? match.participants[0];
            if (!other) continue;
            try {
              const { data, error } = await supabase
                .from("profiles")
                .select("primary_photo_path, photos")
                .or(`id.eq.${other},user_id.eq.${other}`)
                .maybeSingle();
              if (cancelled || error) {
                continue;
              }
              const first = data?.photos?.[0];
              let url: string | null = null;
              const resolvePath = async (path?: string | null) => {
                if (!path) return null;
                try {
                  return await getPhotoUrl(path, supabase);
                } catch {
                  return null;
                }
              };

              url = await resolvePath((data as any)?.primary_photo_path);

              const firstUrl =
                first?.url ||
                first?.signedUrl ||
                first?.signed_url ||
                first?.storagePath ||
                first?.storage_path;

              if (!url && firstUrl && /^https?:\/\//.test(String(firstUrl))) {
                url = String(firstUrl);
              }

              if (!url && firstUrl && !/^https?:\/\//.test(String(firstUrl))) {
                url = await resolvePath(String(firstUrl));
              }

              if (cancelled) continue;
              if (url) {
                setAvatarCache((prev) => ({
                  ...prev,
                  [match.id]: { url, ts: Date.now() }
                }));
              } else if (match.previewPhotoUrl) {
                setAvatarCache((prev) => ({
                  ...prev,
                  [match.id]: { url: match.previewPhotoUrl ?? null, ts: Date.now() }
                }));
              }
            } catch {
              // ignore
            }
          }
        };
        refreshAvatars();
        return () => {
          cancelled = true;
        };
      },
      [matches, session?.user?.id, supabase]
    )
  );

  useEffect(() => {
    const now = Date.now();
    const pending = matches.filter((match) => {
      const cached = Object.prototype.hasOwnProperty.call(avatarCache, match.id)
        ? avatarCache[match.id]
        : undefined;
      if (!cached || cached.url === null) {
        return true;
      }
      const isSignedUrl = typeof cached.url === "string" && /token=|signature=/.test(cached.url);
      const isStale = isSignedUrl || now - cached.ts > AVATAR_CACHE_TTL_MS;
      return isStale;
    });
    if (!pending.length) {
      return;
    }
    let cancelled = false;
    const loadAvatars = async () => {
      for (const match of pending) {
        const other =
          match.participants.find((p) => p !== session?.user?.id) ?? match.participants[0];
        if (!other) continue;
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("primary_photo_path, photos")
            .or(`id.eq.${other},user_id.eq.${other}`)
            .maybeSingle();
          let profileRow = data as any;
          if (!cancelled && (!profileRow || error)) {
            console.warn("[Matches] avatar fetch failed", match.id, error);
            // Fallback: try profile service (may parse photos JSON)
            try {
              profileRow = await fetchProfile(other);
            } catch (err) {
              console.warn("[Matches] fallback profile fetch failed", match.id, err);
            }
          }
          if (cancelled) {
            continue;
          }
          if (!profileRow) {
            if (match.previewPhotoUrl) {
              setAvatarCache((prev) => ({
                ...prev,
                [match.id]: { url: match.previewPhotoUrl ?? null, ts: Date.now() }
              }));
            }
            console.warn("[Matches] no profile row for avatar", match.id, other);
            continue;
          }
          let photosArray: any[] = [];
          if (typeof profileRow.photos === "string") {
            try {
              photosArray = JSON.parse(profileRow.photos) ?? [];
            } catch {
              photosArray = [];
            }
          } else if (Array.isArray(profileRow.photos)) {
            photosArray = profileRow.photos;
          }
          const first = photosArray?.[0];
          let url: string | null = null;
          const primaryPath = (profileRow as any)?.primary_photo_path ?? (profileRow as any)?.primaryPhotoPath;
          const resolvePath = async (path?: string | null) => {
            if (!path) return null;
            if (/^https?:\/\//.test(String(path))) {
              return String(path);
            }
            try {
              return await getPhotoUrl(path, supabase);
            } catch (err) {
              console.warn("[Matches] resolvePath failed", match.id, err);
              return null;
            }
          };

          // Primary photo path first
          url = await resolvePath(primaryPath);

          // Fallbacks inside first photo object with various keys
          const firstUrl =
            first?.url ||
            first?.signedUrl ||
            first?.signed_url ||
            first?.storagePath ||
            first?.storage_path ||
            first?.storageKey ||
            first?.storage_key;

          if (!url && firstUrl && /^https?:\/\//.test(String(firstUrl))) {
            url = String(firstUrl);
          }

          if (!url && firstUrl && !/^https?:\/\//.test(String(firstUrl))) {
            url = await resolvePath(String(firstUrl));
          }

          if (cancelled) continue;
          if (url) {
            setAvatarCache((prev) => ({ ...prev, [match.id]: { url, ts: Date.now() } }));
          } else if (match.previewPhotoUrl) {
            setAvatarCache((prev) => ({
              ...prev,
              [match.id]: { url: match.previewPhotoUrl ?? null, ts: Date.now() }
            }));
          }
        } catch {
          // ignore
        }
      }
    };
    loadAvatars();
    return () => {
      cancelled = true;
    };
  }, [matches, avatarCache, session?.user?.id, supabase]);

  useEffect(() => {
    const avatarByMatch = notifications.reduce<Record<string, string | null>>((acc, entry) => {
      const matchId = entry.data?.match_id ?? entry.data?.matchId;
      const avatarPath = entry.data?.avatar_path ?? entry.data?.avatarUrl;
      if (matchId && avatarPath) {
        acc[matchId] = avatarPath;
      }
      return acc;
    }, {});
    if (Object.keys(avatarByMatch).length) {
      setAvatarCache((prev) => {
        const next = { ...prev };
        Object.entries(avatarByMatch).forEach(([matchId, url]) => {
          next[matchId] = { url: url ?? null, ts: Date.now() };
        });
        return next;
      });
    }
  }, [notifications]);

  useEffect(() => {
    const pending = matches
      .filter((match) => match.lastMessageAt)
      .filter((match) => !Object.prototype.hasOwnProperty.call(lastMessages, match.id));
    if (!pending.length) {
      return;
    }
    let cancelled = false;
    const loadPreviews = async () => {
      for (const match of pending) {
        try {
          const { data, error } = await supabase
            .from("messages")
            .select("id, content, created_at, sender_id, read_at")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cancelled) return;
          if (!error) {
            setLastMessages((prev) => ({
              ...prev,
              [match.id]: data
                ? {
                    content: data.content ?? "",
                    senderId: data.sender_id,
                    createdAt: data.created_at,
                    readAt: (data as any).read_at ?? null
                  }
                : null
            }));
          }
        } catch {
          // ignore preview fetch errors
        }
      }
    };
    loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [matches, lastMessages, supabase]);

  useEffect(() => {
    if (!session?.user?.id || !matches.length) {
      return;
    }
    const matchIds = matches.map((m) => m.id).filter(Boolean);
    if (!matchIds.length) {
      return;
    }
    const matchIdSet = new Set(matchIds);
    const channel = supabase
      .channel(`messages-rt-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row: any = payload.new ?? {};
          const matchId = row.match_id;
          if (!matchId || !matchIdSet.has(matchId)) return;
          setLastMessages((prev) => ({
            ...prev,
            [matchId]: {
              content: row.content ?? "",
              senderId: row.sender_id,
              createdAt: row.created_at,
              readAt: row.read_at ?? null
            }
          }));
          if (row.sender_id !== session.user?.id) {
            const currentUnread = useChatStore.getState().unreadCounts[matchId] ?? 0;
            setUnread(matchId, currentUnread + 1);
          }
          // Ensure list refetch so badges/ordering stay up to date
          queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [matchIdsKey, matches.length, queryClient, session?.user?.id, setUnread, supabase]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.wrapper}>
        <View style={styles.tabsSingle}>
          <View style={styles.tabsSinglePill}>
            <Text style={styles.tabsSingleText}>{copy.tabLabel}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{copy.cardTitle}</Text>
            <View style={styles.searchWrapper} />
          </View>
          {hasMatches ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchScroller}>
              {matches.map((match, index) => (
                <View key={match.id} style={styles.matchTileWrapper}>
                  {renderMatch({ item: match, showSubtitle: false })}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.placeholderRow}>
              <View style={styles.placeholderAvatar} />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sectionTitle}</Text>
          {messageThreads.length ? (
            messageThreads.map((match) => renderMessageRow(match))
          ) : (
            <Text style={styles.messagesEmpty}>{copy.messagesEmpty}</Text>
          )}
        </View>

        {!hasMatches && (
          <>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
              <Text style={styles.emptySubtitle}>{copy.emptySubtitle}</Text>
            </View>
            <Pressable style={styles.ctaButton} onPress={() => navigation.navigate("Settings")}>
              <Text style={styles.ctaText}>{copy.ctaFilters}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff"
  },
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 24,
    backgroundColor: "#fff",
    flexGrow: 1
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  tabsSingle: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24
  },
  tabsSinglePill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: brandGreen
  },
  tabsSingleText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  card: {
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#ebedf2",
    shadowColor: "#0d6e4f",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2b2d33",
    textAlign: "left",
    flex: 1
  },
  searchWrapper: {
    alignItems: "center",
    justifyContent: "center"
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2b2d33",
    marginBottom: 12
  },
  messagesEmpty: {
    fontSize: 14,
    color: "#7c8089",
    paddingHorizontal: 4
  },
  placeholderRow: {
    height: 120,
    justifyContent: "center",
    alignItems: "flex-start"
  },
  placeholderAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#d5d6dc",
    borderStyle: "dashed",
    marginVertical: 12
  },
  matchScroller: {
    paddingVertical: 4,
    gap: 12
  },
  matchTileWrapper: {
    marginRight: 12
  },
  matchRow: {
    width: 104,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6
  },
  matchTitle: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8
  },
  matchSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    textAlign: "center"
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 0,
    marginLeft: 0
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginRight: 0,
    marginLeft: 0,
    backgroundColor: "#dfe2e8"
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ebedf2",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  messageAvatarWrapper: {
    width: 52,
    height: 52,
    marginRight: 12
  },
  messageAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dfe2e8"
  },
  messageAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dfe2e8"
  },
  statusDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#f5f5f5",
    top: -2,
    right: 4
  },
  statusDotActive: {
    backgroundColor: "#0fc15b"
  },
  statusDotOffline: {
    backgroundColor: "#f7a531"
  },
  messageContent: {
    flex: 1,
    gap: 4
  },
  messageName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  messageNameUnread: {
    fontWeight: "800",
    color: "#0f172a"
  },
  messagePreview: {
    fontSize: 14,
    color: "#4b5563"
  },
  messagePreviewUnread: {
    color: "#0f172a"
  },
  messageMeta: {
    marginLeft: 10,
    alignSelf: "flex-start"
  },
  messageStatus: {
    fontSize: 12,
    color: "#6b7280"
  },
  messageStatusUnread: {
    color: brandGreen,
    fontWeight: "700"
  },
  unreadPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: brandGreen,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadPillText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12
  },
  emptyText: {
    fontSize: 16,
    color: "#666"
  },
  badge: {
    backgroundColor: "#eb5757",
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: "center"
  },
  badgeText: {
    color: "#fff",
    fontWeight: "600"
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 150,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: "#2b2d33"
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#7b7f8d",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16
  },
  ctaButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dfe2e8",
    paddingVertical: 14,
    marginTop: 0,
    borderRadius: 999,
    alignItems: "center"
  },
  ctaText: {
    color: "#2b2d33",
    fontWeight: "700",
    fontSize: 16
  }
});

export default MatchesScreen;
