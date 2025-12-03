import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { getSupabaseClient } from "./supabaseClient";

const QUEUE_KEY = "app.events.queue";
const MAX_BATCH_SEND = 20;

export type EventName = "app_open" | "view_profile" | "like" | "match" | "message_send";

type QueuedEvent = {
  user_id: string;
  name: EventName;
  props?: Record<string, unknown> | null;
  created_at?: string;
};

export const track = async (name: EventName, props?: Record<string, unknown>) => {
  const supabase = getSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const userId = session?.user?.id;
  if (!userId) {
    return;
  }

  const event: QueuedEvent = {
    user_id: userId,
    name,
    props: props ?? null,
    created_at: new Date().toISOString()
  };

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    await enqueue(event);
    return;
  }

  try {
    await supabase.from("events").insert(event);
  } catch {
    await enqueue(event);
  }
};

export const flushEvents = async () => {
  const supabase = getSupabaseClient();
  const queue = await readQueue();
  if (!queue.length) {
    return;
  }

  const batches = chunk(queue, MAX_BATCH_SEND);
  const remaining: QueuedEvent[] = [];
  for (const batch of batches) {
    try {
      await supabase.from("events").insert(batch);
    } catch {
      remaining.push(...batch);
    }
  }
  await writeQueue(remaining);
};

const enqueue = async (event: QueuedEvent) => {
  const queue = await readQueue();
  queue.push(event);
  await writeQueue(queue);
};

const readQueue = async (): Promise<QueuedEvent[]> => {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as QueuedEvent[];
  } catch {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return [];
  }
};

const writeQueue = async (entries: QueuedEvent[]) => {
  if (!entries.length) {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return;
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};
