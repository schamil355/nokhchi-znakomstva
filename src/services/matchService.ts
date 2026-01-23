import AsyncStorage from "@react-native-async-storage/async-storage";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { Match, Message } from "../types";
import { useChatStore } from "../state/chatStore";
import { track } from "../lib/analytics";
import { getPhotoUrl, PROFILE_BUCKET } from "../lib/storage";
import { getSignedPhotoUrl } from "./photoService";
import { getCurrentLocale } from "../localization/LocalizationProvider";

const sendLimiter = createRateLimiter({ intervalMs: 2_000, maxCalls: 10 });
const MESSAGE_QUEUE_KEY = "offline_message_queue";

const sendMessageCopy: Record<string, Record<string, string>> = {
  en: {
    empty: "Message cannot be empty."
  },
  de: {
    empty: "Nachricht darf nicht leer sein."
  },
  fr: {
    empty: "Le message ne peut pas être vide."
  },
  ru: {
    empty: "Сообщение не может быть пустым."
  }
} satisfies Record<SupportedLocale, Record<string, string>>;

const tSend = (key: keyof typeof sendMessageCopy.en) => {
  const locale = getCurrentLocale();
  return sendMessageCopy[locale]?.[key] ?? sendMessageCopy.en[key];
};

type OfflineMessage = {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const executeWithBackoff = async <T>(fn: () => Promise<T>, attempts = 3, baseDelay = 400): Promise<T> => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === attempts - 1) {
        throw error;
      }
      await delay(baseDelay * 2 ** attempt);
    }
  }
  throw new Error("Max retries exceeded");
};

const readQueue = async (): Promise<OfflineMessage[]> => {
  const raw = await AsyncStorage.getItem(MESSAGE_QUEUE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as OfflineMessage[];
  } catch {
    await AsyncStorage.removeItem(MESSAGE_QUEUE_KEY);
    return [];
  }
};

const writeQueue = async (entries: OfflineMessage[]) => {
  if (!entries.length) {
    await AsyncStorage.removeItem(MESSAGE_QUEUE_KEY);
    return;
  }
  await AsyncStorage.setItem(MESSAGE_QUEUE_KEY, JSON.stringify(entries));
};

const enqueueMessage = async (message: OfflineMessage) => {
  const queue = await readQueue();
  queue.push(message);
  await writeQueue(queue);
};

type FetchMatchesOptions = {
  viewerIsIncognito?: boolean;
};

export const fetchMatches = async (userId: string, options: FetchMatchesOptions = {}): Promise<Match[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("matches_v")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsLast: true })
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }

  let matches = (data ?? []).map(mapMatch);

  if (!matches.length) {
    return matches;
  }

  const participantIds = Array.from(
    new Set(
      matches.flatMap((match) => match.participants.filter((participant) => participant !== userId))
    )
  );

  if (!participantIds.length) {
    return matches;
  }

  let profiles: any[] = [];
  try {
    const { data: byUser, error: errUser } = await supabase
      .from("profiles")
      .select("id, user_id, photos, primary_photo_path, primary_photo_id, display_name, is_incognito")
      .in("user_id", participantIds);
    if (errUser) {
      console.warn("[fetchMatches] profile lookup by user_id failed", errUser);
    }
    const { data: byId, error: errId } = await supabase
      .from("profiles")
      .select("id, user_id, photos, primary_photo_path, primary_photo_id, display_name, is_incognito")
      .in("id", participantIds);
    if (errId) {
      console.warn("[fetchMatches] profile lookup by id failed", errId);
    }
    const merged = [...(byUser ?? []), ...(byId ?? [])];
    const seen = new Set<string>();
    profiles = merged.filter((row) => {
      const key = (row as any)?.id ?? (row as any)?.user_id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Fallback for missing entries (individual lookup)
    const missing = participantIds.filter((id) => !profiles.find((row: any) => row.id === id || row.user_id === id));
    for (const id of missing) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, photos, primary_photo_path, primary_photo_id, display_name, is_incognito")
        .or(`user_id.eq.${id},id.eq.${id}`)
        .maybeSingle();
      if (error) {
        console.warn("[fetchMatches] fallback profile lookup failed", id, error);
        continue;
      }
      if (data) {
        profiles.push(data);
      }
    }
  } catch (err) {
    console.warn("[fetchMatches] profile lookup threw", err);
  }

  const photoEntries =
    profiles?.map(async (row: any) => {
      const isIncognito = Boolean(row.is_incognito);
      let url: string | null = null;
      const firstRaw = Array.isArray(row.photos) && row.photos.length > 0 ? row.photos[0] : null;
      const firstPhoto =
        typeof firstRaw === "string"
          ? (() => {
              try {
                return JSON.parse(firstRaw);
              } catch {
                return null;
              }
            })()
          : firstRaw;

      const resolvePath = async (path?: string | null) => {
        if (!path) return null;
        if (/^https?:\/\//.test(String(path))) {
          return String(path);
        }
        // Try signed/public helper
        try {
          const signed = await getPhotoUrl(path, supabase);
          if (signed) return signed;
        } catch {
          // ignore
        }
        // Try public URL helper (use configured bucket)
        const { data } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
        // Manual fallback
        const supabaseUrl =
          (supabase as any)?.supabaseUrl ??
          process.env.EXPO_PUBLIC_SUPABASE_URL ??
          process.env.EXPO_SUPABASE_URL ??
          "";
        if (supabaseUrl) {
          return `${supabaseUrl}/storage/v1/object/public/${PROFILE_BUCKET}/${path}`;
        }
        // Try userId/path fallback if path has no slash
        if (!String(path).includes("/")) {
          const fallbackPath = `${row.user_id}/${path}`;
          try {
            const signedFallback = await getPhotoUrl(fallbackPath, supabase);
            if (signedFallback) return signedFallback;
          } catch {
            // ignore
          }
          if (supabaseUrl) {
            return `${supabaseUrl}/storage/v1/object/public/${PROFILE_BUCKET}/${fallbackPath}`;
          }
        }
        return null;
      };

      if (!isIncognito) {
        const rawPhotoId =
          (row as any)?.primary_photo_id ??
          (row as any)?.primaryPhotoId ??
          firstPhoto?.assetId ??
          firstPhoto?.asset_id ??
          firstPhoto?.photoId ??
          firstPhoto?.photo_id ??
          null;
        const photoId =
          typeof rawPhotoId === "number"
            ? rawPhotoId
            : rawPhotoId && Number.isFinite(Number(rawPhotoId))
              ? Number(rawPhotoId)
              : null;

        if (photoId) {
          try {
            const signed = await getSignedPhotoUrl(photoId);
            if (signed?.url) {
              url = signed.url;
            }
          } catch (err) {
            console.warn("[fetchMatches] signed photo failed", err);
          }
        }

        // Try primary photo path
        if (!url && row.primary_photo_path) {
          url = await resolvePath(row.primary_photo_path);
        }

        // Fallbacks inside first photo object (handle different key variants)
        if (!url && firstPhoto) {
          const candidate =
            firstPhoto.url ||
            firstPhoto.signedUrl ||
            firstPhoto.signed_url ||
            firstPhoto.storagePath ||
            firstPhoto.storage_path;
          const isFileScheme = typeof candidate === "string" && candidate.startsWith("file://");
          if (candidate && !isFileScheme && /^https?:\/\//.test(String(candidate))) {
            url = String(candidate);
          } else if (candidate && !isFileScheme) {
            url = await resolvePath(String(candidate));
          }
        }
      }

      const userId = (row as any)?.user_id ?? (row as any)?.id;
      return {
        userId: userId as string,
        url,
        displayName: row.display_name as string | null,
        isIncognito
      };
    }) ?? [];

  const resolvedPhotos = await Promise.all(photoEntries);
  const photoMap = new Map<string, { url: string | null; displayName: string | null; isIncognito: boolean }>();
  for (const entry of resolvedPhotos) {
    photoMap.set(entry.userId, {
      url: entry.url ?? null,
      displayName: entry.displayName ?? null,
      isIncognito: Boolean(entry.isIncognito)
    });
  }

  return matches.map((match) => {
    const otherParticipant = match.participants.find((participant) => participant !== userId) ?? match.participants[0];
    const profileMeta = otherParticipant ? photoMap.get(otherParticipant) ?? null : null;
    const forceIncognito = profileMeta?.isIncognito ?? false;
    return {
      ...match,
      previewPhotoUrl: forceIncognito ? null : profileMeta?.url ?? null,
      otherDisplayName: profileMeta?.displayName ?? null,
      otherIsIncognito: forceIncognito
    };
  });
};

export const fetchMessages = async (matchId: string, limit = 50): Promise<Message[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw error;
  }
  return (data ?? []).map(mapMessage);
};

export const sendMessage = async (matchId: string, senderId: string, content: string): Promise<Message> =>
  sendLimiter(async () => {
    const supabase = getSupabaseClient();
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error(tSend("empty"));
    }

    await track("message_send", { matchId }).catch(() => undefined);

    try {
      const createdAt = new Date().toISOString();
      const { data, error } = await executeWithBackoff(() =>
        supabase
          .from("messages")
          .insert({
            match_id: matchId,
            sender_id: senderId,
            content: trimmed,
            created_at: createdAt
          })
          .select()
          .single()
      );
      if (error) {
        throw error;
      }
      return mapMessage(data);
    } catch (error) {
      await enqueueMessage({
        id: `${Date.now()}-${Math.random()}`,
        matchId,
        senderId,
        content: trimmed,
        createdAt: new Date().toISOString()
      });
      throw error;
    }
  });

export const subscribeToMessages = (
  matchId: string,
  onMessage: (message: Message) => void,
  onTyping?: (isTyping: boolean) => void
): RealtimeChannel => {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `match_id=eq.${matchId}`
      },
      (payload) => {
        onMessage(mapMessage(payload.new));
      }
    )
    .subscribe();

  if (onTyping) {
    channel.on(
      "broadcast",
      { event: "typing" },
      (payload) => {
        const isTyping = Boolean(payload.payload?.isTyping);
        onTyping(isTyping);
      }
    );
  }

  return channel;
};

export const sendTypingEvent = (channel: RealtimeChannel, matchId: string, isTyping: boolean) => {
  channel.send({
    type: "broadcast",
    event: "typing",
    payload: { matchId, isTyping }
  });
  useChatStore.getState().setTyping(matchId, isTyping);
};

export const flushQueuedMessages = async (matchScope?: string) => {
  const supabase = getSupabaseClient();
  const queue = await readQueue();
  if (!queue.length) {
    return;
  }
  const remaining: OfflineMessage[] = [];
  for (const entry of queue) {
    if (matchScope && entry.matchId !== matchScope) {
      remaining.push(entry);
      continue;
    }
    try {
      await executeWithBackoff(() =>
        supabase.from("messages").insert({
          match_id: entry.matchId,
          sender_id: entry.senderId,
          content: entry.content,
          created_at: entry.createdAt
        })
      );
    } catch {
      remaining.push(entry);
    }
  }
  await writeQueue(remaining);
};

export const markMessagesAsRead = async (matchId: string, userId: string) => {
  const supabase = getSupabaseClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .neq("sender_id", userId)
    .is("read_at", null);
};

const mapMatch = (row: any): Match => ({
  id: row.id,
  participants: row.participants ?? [],
  createdAt: row.created_at,
  lastMessageAt: row.last_message_at ?? undefined,
  isActive: Boolean(row.is_active),
  previewPhotoUrl: row.preview_photo_url ?? row.previewPhotoUrl ?? null
});

const mapMessage = (row: any): Message => ({
  id: row.id,
  matchId: row.match_id,
  senderId: row.sender_id,
  content: row.content,
  createdAt: row.created_at,
  readAt: row.read_at ?? undefined
});
