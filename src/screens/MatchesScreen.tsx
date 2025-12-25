import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import SafeAreaView from "../components/SafeAreaView";
import { useMatches } from "../hooks/useMatches";
import { useDirectChats } from "../hooks/useDirectChats";
import { useAuthStore } from "../state/authStore";
import { DirectConversation, Match } from "../types";
import { useChatStore } from "../state/chatStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl } from "../lib/storage";
import { fetchProfile } from "../services/profileService";
import { useNotificationsStore } from "../state/notificationsStore";
import { LinearGradient } from "expo-linear-gradient";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  slate: "rgba(242,231,215,0.75)"
};
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
  directChatLabel?: string;
  directChatHint?: string;
  statusRead?: string;
  statusNew?: string;
  messageLabel?: string;
  statusSent?: string;
  likesTitle?: string;
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
    directChatLabel: "Direct chat",
    directChatHint: "No direct chats yet.",
    likesTitle: "",
    statusRead: "read",
    statusNew: "new",
    messageLabel: "Message",
    statusSent: "sent",
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
    directChatLabel: "DirektChat",
    directChatHint: "Noch keine Direktchats.",
    likesTitle: "",
    statusRead: "gelesen",
    statusNew: "neu",
    messageLabel: "Message",
    statusSent: "gesendet",
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
    directChatLabel: "Direct chat",
    directChatHint: "Aucun direct chat pour le moment.",
    likesTitle: "",
    statusRead: "lu",
    statusNew: "nouveau",
    messageLabel: "Message",
    statusSent: "envoyé",
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
    directChatLabel: "Direct chat",
    directChatHint: "Пока нет прямых чатов.",
    likesTitle: "",
    statusRead: "прочитано",
    statusNew: "новое",
    messageLabel: "Message",
    statusSent: "отправлено",
  },
};

const MatchesScreen = () => {
  const { data: matches = [], isLoading, refetch: refetchMatches } = useMatches();
  const { data: directChats = [], isLoading: isDirectLoading, refetch: refetchDirectChats } = useDirectChats();
  const session = useAuthStore((state) => state.session);
  const navigation = useNavigation<any>();
  const unread = useChatStore((state) => state.unreadCounts);
  const setUnread = useChatStore((state) => state.setUnread);
  const copy = useLocalizedCopy(translations);
  const [avatarCache, setAvatarCache] = useState<Record<string, { url: string | null; ts: number }>>({});
  const [avatarCacheLoaded, setAvatarCacheLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"matches" | "directChat">("matches");
  const supabase = useMemo(() => getSupabaseClient(), []);
  const queryClient = useQueryClient();
  const notifications = useNotificationsStore((state) => state.items);
  const incognitoLikerIds = useMemo(() => {
    const ids = new Set<string>();
    notifications.forEach((entry) => {
      const data = entry.data ?? {};
      const likerId = data.liker_id ?? data.likerId ?? data.other_user_id ?? data.otherUserId;
      const isIncognito =
        data.liker_incognito ?? data.likerIncognito ?? data.other_incognito ?? data.otherIncognito ?? false;
      if (likerId && isIncognito) {
        ids.add(String(likerId));
      }
    });
    return ids;
  }, [notifications]);

  const incognitoMatchIds = useMemo(() => {
    const ids = new Set<string>();
    notifications.forEach((entry) => {
      const data = entry.data ?? {};
      const matchId = data.match_id ?? data.matchId ?? data.match;
      const isIncognito =
        data.liker_incognito ?? data.likerIncognito ?? data.other_incognito ?? data.otherIncognito ?? false;
      if (matchId && isIncognito) {
        ids.add(String(matchId));
      }
    });
    return ids;
  }, [notifications]);
  const isIncognitoMatch = useCallback(
    (item: Match) => {
      const otherParticipant =
        item.participants.find((participant) => participant !== session?.user.id) ?? item.participants[0];
      return Boolean(
        item.otherIsIncognito ||
          !item.previewPhotoUrl ||
          incognitoMatchIds.has(item.id) ||
          (otherParticipant && incognitoLikerIds.has(otherParticipant))
      );
    },
    [incognitoLikerIds, incognitoMatchIds, session?.user?.id]
  );
  const [lastMessages, setLastMessages] = useState<
    Record<string, { content: string; senderId: string; createdAt: string; readAt?: string | null } | null>
  >({});
  const matchIdsKey = matches.map((m) => m.id).join(",");
  const regularMatches = useMemo(
    () =>
      matches.filter((m) => {
        if (typeof isIncognitoMatch !== "function") {
          return Boolean(m.previewPhotoUrl);
        }
        return !isIncognitoMatch(m) && m.previewPhotoUrl;
      }),
    [isIncognitoMatch, matches]
  );

  useFocusEffect(
    useCallback(() => {
      refetchMatches();
      refetchDirectChats();
    }, [refetchDirectChats, refetchMatches])
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

  // Remove cached avatars for matches without preview photos (e.g., incognito)
  useEffect(() => {
    if (!avatarCacheLoaded) return;
    const missingAvatarMatchIds = matches
      .filter((m) => !m.previewPhotoUrl)
      .map((m) => m.id);
    if (!missingAvatarMatchIds.length) return;
    setAvatarCache((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of missingAvatarMatchIds) {
        if (Object.prototype.hasOwnProperty.call(next, id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [avatarCacheLoaded, matches]);

  // Drop cached avatars for matches that are flagged incognito via notifications
  useEffect(() => {
    if (!avatarCacheLoaded || (!incognitoLikerIds.size && !incognitoMatchIds.size)) return;
    const incognitoByParticipant = matches
      .filter((match) =>
        match.participants.some((participant) => {
          const currentUserId = session?.user?.id;
          return participant !== currentUserId && incognitoLikerIds.has(participant);
        })
      )
      .map((match) => match.id);
    const allIncognito = [...new Set([...incognitoByParticipant, ...Array.from(incognitoMatchIds)])];
    if (!allIncognito.length) return;
    setAvatarCache((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of allIncognito) {
        if (Object.prototype.hasOwnProperty.call(next, id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [avatarCacheLoaded, incognitoLikerIds, incognitoMatchIds, matches, session?.user?.id]);

  const renderMatch = ({
    item,
    showSubtitle = true,
    forcePlaceholder = false
  }: {
    item: Match;
    showSubtitle?: boolean;
    forcePlaceholder?: boolean;
  }) => {
    const otherParticipant =
      item.participants.find((participant) => participant !== session?.user.id) ?? item.participants[0];
    const title = item.otherDisplayName ?? (showSubtitle ? copy.matchLabel(item.id.slice(0, 6)) : "");
    const cachedEntry = Object.prototype.hasOwnProperty.call(avatarCache, item.id) ? avatarCache[item.id] : undefined;
    const incognito = forcePlaceholder || isIncognitoMatch(item);
    const avatarUri = incognito ? null : cachedEntry?.url ?? item.previewPhotoUrl ?? null;
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
    const isIncognito = isIncognitoMatch(item);
    const avatarUri = isIncognito ? null : cachedEntry?.url ?? item.previewPhotoUrl ?? null;
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

  const renderDirectChatRow = (item: DirectConversation) => {
    const avatarUri = item.otherProfilePhoto ?? item.otherProfile?.photos?.[0]?.url ?? null;
    const title = item.otherProfile?.displayName ?? "Direktchat";
    const lastMessage = item.lastMessage ?? null;
    const snippet = lastMessage?.content?.trim() || copy.messagesEmpty;
    const isUnread =
      Boolean(lastMessage && lastMessage.senderId !== session?.user?.id && !lastMessage.readAt);
    const isOwnLast = lastMessage?.senderId === session?.user?.id;
    const isRead = Boolean(lastMessage?.readAt);
    const statusText = (() => {
      if (isUnread) return copy.statusNew ?? "new";
      if (isOwnLast && isRead) return copy.statusRead ?? "read";
      if (isOwnLast && !isRead) return copy.statusSent ?? "sent";
      return "";
    })();
    const lastActiveRaw = item.lastMessageAt ?? lastMessage?.createdAt ?? null;
    const lastActive = lastActiveRaw ? new Date(lastActiveRaw).getTime() : 0;
    const online = lastActive && Date.now() - lastActive < 5 * 60 * 1000;

    return (
      <Pressable
        key={`direct-${item.id}`}
        style={styles.messageCard}
        onPress={() => {
          if (!item.otherUserId) {
            return;
          }
          navigation.navigate("DirectChat", { conversationId: item.id, otherUserId: item.otherUserId });
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
  const directThreads = directChats;

  useEffect(() => {
    // Seed cache with existing previewPhotoUrl
    matches.forEach((match) => {
      if (isIncognitoMatch(match)) {
        return;
      }
      const existing = Object.prototype.hasOwnProperty.call(avatarCache, match.id) ? avatarCache[match.id] : undefined;
      if (match.previewPhotoUrl && (!existing || existing.url === null)) {
        setAvatarCache((prev) => ({
          ...prev,
          [match.id]: { url: match.previewPhotoUrl ?? null, ts: Date.now() }
        }));
      }
    });
  }, [avatarCache, isIncognitoMatch, matches]);

  useFocusEffect(
    useMemo(
      () => () => {
        let cancelled = false;
        const refreshAvatars = async () => {
          for (const match of matches) {
            if (isIncognitoMatch(match)) {
              continue;
            }
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
      [isIncognitoMatch, matches, session?.user?.id, supabase]
    )
  );

  useEffect(() => {
    const now = Date.now();
    const pending = matches.filter((match) => {
      if (isIncognitoMatch(match)) {
        return false;
      }
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
            if (isIncognitoMatch(match)) {
              continue;
            }
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
  }, [avatarCache, isIncognitoMatch, matches, session?.user?.id, supabase]);

  useEffect(() => {
    const avatarByMatch = notifications.reduce<Record<string, string | null>>((acc, entry) => {
      const incognito =
        entry.data?.liker_incognito ??
        entry.data?.likerIncognito ??
        entry.data?.other_incognito ??
        entry.data?.otherIncognito ??
        false;
      const matchId = entry.data?.match_id ?? entry.data?.matchId;
      const avatarPath = entry.data?.avatar_path ?? entry.data?.avatarUrl;
      if (matchId && avatarPath && !incognito) {
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
  }, [isIncognitoMatch, lastMessages, matches, supabase]);

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
  }, [matchIdsKey, matches, matches.length, queryClient, session?.user?.id, setUnread, supabase]);

  const content = (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.wrapper}>
        <View style={styles.tabsSingle}>
          <View style={styles.segmentWrapper}>
            {(["matches", "directChat"] as const).map((tab) => {
              const active = activeTab === tab;
              const label = tab === "matches" ? copy.tabLabel : copy.directChatLabel ?? copy.tabLabel;
              return (
                <Pressable
                  key={tab}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  {active ? (
                    <LinearGradient
                      colors={[PALETTE.gold, "#8b6c2a"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.segmentInner}
                    >
                      <Text style={styles.segmentTextActive}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.segmentInner, styles.segmentInnerInactive]}>
                      <Text style={styles.segmentText}>{label}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === "matches" ? (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{copy.cardTitle}</Text>
                <View style={styles.headerSpacer} />
              </View>
              {regularMatches.length ? (
                <View style={styles.scrollerWrapper}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchScroller}>
                    {regularMatches.map((match) => (
                      <View key={match.id} style={styles.matchTileWrapper}>
                        {renderMatch({ item: match, showSubtitle: false })}
                      </View>
                    ))}
                  </ScrollView>
                </View>
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
                <Pressable style={styles.ctaButton} onPress={() => navigation.navigate("Filters" as never)}>
                  <LinearGradient
                    colors={[PALETTE.gold, "#8b6c2a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.ctaButtonInner}
                  >
                    <Text style={styles.ctaText}>{copy.ctaFilters}</Text>
                  </LinearGradient>
                </Pressable>
              </>
            )}
          </>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{copy.directChatLabel ?? copy.tabLabel}</Text>
            {isDirectLoading ? (
              <View style={styles.sectionLoading}>
                <ActivityIndicator size="small" color={PALETTE.gold} />
              </View>
            ) : directThreads.length ? (
              directThreads.map((thread) => renderDirectChatRow(thread))
            ) : (
              <Text style={styles.messagesEmpty}>{copy.directChatHint ?? copy.messagesEmpty}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PALETTE.gold} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      {content}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 32,
    flexGrow: 1,
    gap: 16
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
    marginBottom: 12,
    paddingHorizontal: 4
  },
  segmentWrapper: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.32)",
    backgroundColor: "rgba(0,0,0,0.18)"
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent"
  },
  segmentActive: {
    borderWidth: 0,
    borderColor: "transparent"
  },
  segmentText: {
    color: "rgba(242,231,215,0.7)",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2
  },
  segmentTextActive: {
    color: PALETTE.sand
  },
  segmentInner: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  segmentInnerInactive: {
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  card: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.32)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12
  },
  headerSpacer: {
    width: 16,
    height: 1
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.sand,
    textAlign: "left",
    flex: 1
  },
  section: {
    marginBottom: 24,
    gap: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.sand,
    marginBottom: 12
  },
  sectionLoading: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  messagesEmpty: {
    fontSize: 15,
    color: "rgba(242,231,215,0.7)",
    paddingHorizontal: 4
  },
  placeholderRow: {
    height: 80,
    justifyContent: "center",
    alignItems: "flex-start"
  },
  placeholderAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "rgba(217,192,143,0.35)",
    borderStyle: "dashed",
    marginVertical: 12,
    backgroundColor: "rgba(255,255,255,0.04)"
  },
  matchScroller: {
    paddingVertical: 4,
    gap: 12
  },
  scrollerWrapper: {
    minHeight: 90
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
    marginTop: 8,
    color: PALETTE.sand
  },
  matchSubtitle: {
    fontSize: 12,
    color: "rgba(242,231,215,0.65)",
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.16)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
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
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  messageAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  statusDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "rgba(15,26,18,0.8)",
    top: -2,
    right: 4
  },
  statusDotActive: {
    backgroundColor: "#19bc7c"
  },
  statusDotOffline: {
    backgroundColor: "#d99f3c"
  },
  messageContent: {
    flex: 1,
    gap: 4
  },
  messageName: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.sand
  },
  messageNameUnread: {
    fontWeight: "800",
    color: "#fff"
  },
  messagePreview: {
    fontSize: 14,
    color: "rgba(242,231,215,0.75)"
  },
  messagePreviewUnread: {
    color: PALETTE.sand
  },
  messageMeta: {
    marginLeft: 10,
    alignSelf: "flex-start"
  },
  messageStatus: {
    fontSize: 12,
    color: "rgba(242,231,215,0.65)"
  },
  messageStatusUnread: {
    color: PALETTE.gold,
    fontWeight: "700"
  },
  unreadPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: PALETTE.gold,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadPillText: {
    color: "#0b1f16",
    fontWeight: "700",
    fontSize: 12
  },
  emptyText: {
    fontSize: 16,
    color: PALETTE.sand
  },
  badge: {
    backgroundColor: PALETTE.gold,
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: "center"
  },
  badgeText: {
    color: "#0b1f16",
    fontWeight: "700"
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 120,
    marginBottom: 12
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: PALETTE.sand
  },
  emptySubtitle: {
    fontSize: 15,
    color: "rgba(242,231,215,0.75)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16
  },
  ctaButton: {
    marginTop: 16,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.5)"
  },
  ctaButtonInner: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999
  },
  ctaText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.2
  }
});

export default MatchesScreen;
