import AsyncStorage from "@react-native-async-storage/async-storage";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { Match, Message } from "../types";
import { useChatStore } from "../state/chatStore";
import { track } from "../lib/analytics";

const sendLimiter = createRateLimiter({ intervalMs: 2_000, maxCalls: 10 });
const MESSAGE_QUEUE_KEY = "offline_message_queue";

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

export const fetchMatches = async (userId: string): Promise<Match[]> => {
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
  return (data ?? []).map(mapMatch);
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

export const sendMessage = async (matchId: string, senderId: string, content: string): Promise<void> =>
  sendLimiter(async () => {
    const supabase = getSupabaseClient();
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error("Nachricht darf nicht leer sein.");
    }

    await track("message_send", { matchId }).catch(() => undefined);

    try {
      await executeWithBackoff(() =>
        supabase.from("messages").insert({
          match_id: matchId,
          sender_id: senderId,
          content: trimmed
        })
      );
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
  isActive: Boolean(row.is_active)
});

const mapMessage = (row: any): Message => ({
  id: row.id,
  matchId: row.match_id,
  senderId: row.sender_id,
  content: row.content,
  createdAt: row.created_at,
  readAt: row.read_at ?? undefined
});
