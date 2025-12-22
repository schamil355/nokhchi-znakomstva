import { getSupabaseClient } from "../lib/supabaseClient";
import { DirectConversation, DirectMessage, Profile } from "../types";
import { fetchProfile } from "./profileService";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getPhotoUrl } from "../lib/storage";

const mapMessage = (row: any): DirectMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  content: row.content,
  createdAt: row.created_at,
  readAt: row.read_at ?? null
});

const mapConversation = (row: any, viewerId: string): DirectConversation => ({
  id: row.id,
  userA: row.user_a,
  userB: row.user_b,
  createdAt: row.created_at,
  lastMessageAt: row.last_message_at ?? null,
  otherUserId: row.user_a === viewerId ? row.user_b : row.user_a
});

const resolveProfilePhoto = async (profile: Profile | null, supabase: ReturnType<typeof getSupabaseClient>) => {
  if (!profile) return null;
  const firstPhoto = profile.photos?.[0];
  if (firstPhoto?.url && /^https?:\/\//.test(firstPhoto.url)) {
    return firstPhoto.url;
  }
  const candidates: (string | null | undefined)[] = [
    firstPhoto?.storagePath,
    profile.primaryPhotoPath,
    firstPhoto?.url && !/^https?:\/\//.test(firstPhoto.url) ? firstPhoto.url : null
  ].filter(Boolean);
  for (const candidate of candidates as string[]) {
    try {
      const signed = await getPhotoUrl(candidate, supabase);
      if (signed) return signed;
    } catch {
      // try next
    }
  }
  return null;
};

export const ensureDirectConversation = async (viewerId: string, targetUserId: string): Promise<string> => {
  const supabase = getSupabaseClient();
  const isViewerFirst = viewerId.localeCompare(targetUserId) <= 0;
  const userA = isViewerFirst ? viewerId : targetUserId;
  const userB = isViewerFirst ? targetUserId : viewerId;

  // Try both orders to account for any legacy rows that are stored unsorted.
  const existing = await supabase
    .from("direct_conversations")
    .select("id")
    .or(
      `and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`
    )
    .maybeSingle();

  if (existing.data?.id) {
    return existing.data.id;
  }

  const { data, error } = await supabase
    .from("direct_conversations")
    .insert({ user_a: userA, user_b: userB })
    .select("id")
    .single();

  if (error?.code === "23505") {
    // Duplicate pair (race condition or legacy ordering) – fetch the existing row and return it.
    const retry = await supabase
      .from("direct_conversations")
      .select("id")
      .or(
        `and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`
      )
      .maybeSingle();
    if (retry.data?.id) {
      return retry.data.id;
    }
  }

  if (error) {
    throw error;
  }
  return data.id as string;
};

export const fetchDirectChats = async (viewerId: string): Promise<DirectConversation[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("direct_conversations")
    .select("*")
    .or(`user_a.eq.${viewerId},user_b.eq.${viewerId}`)
    .order("last_message_at", { ascending: false, nullsLast: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const base = (data ?? []).map((row) => mapConversation(row, viewerId));

  const withProfileAndMessage = await Promise.all(
    base.map(async (conv) => {
      let lastMessage: DirectMessage | null = null;
      try {
        const res = await supabase
          .from("direct_messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (res.data) {
          lastMessage = mapMessage(res.data);
        }
      } catch {
        // ignore
      }

      let otherProfile: any = null;
      let otherProfilePhoto: string | null = null;
      if (conv.otherUserId) {
        try {
          otherProfile = await fetchProfile(conv.otherUserId);
          otherProfilePhoto = await resolveProfilePhoto(otherProfile, supabase);
        } catch {
          otherProfile = null;
        }
      }
      return {
        ...conv,
        lastMessage,
        otherProfile,
        otherProfilePhoto
      };
    })
  );

  // Nur Konversationen mit mindestens einer Nachricht zeigen (verhindert leere Threads nach „Direktchat öffnen“ ohne Nachricht).
  return withProfileAndMessage.filter((conv) => Boolean(conv.lastMessage));
};

export const fetchDirectMessages = async (conversationId: string): Promise<DirectMessage[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("direct_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMessage);
};

export const sendDirectMessage = async (
  conversationId: string,
  senderId: string,
  content: string
): Promise<DirectMessage> => {
  const supabase = getSupabaseClient();
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Nachricht leer");
  }
  const createdAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("direct_messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content: trimmed, created_at: createdAt })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapMessage(data);
};

export const subscribeToDirectMessages = (
  conversationId: string,
  onMessage: (message: DirectMessage) => void
): RealtimeChannel => {
  const supabase = getSupabaseClient();
  const channel = supabase
    .channel(`direct_messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const row = payload.new as any;
        onMessage(mapMessage(row));
      }
    )
    .subscribe();
  return channel;
};
