import { z } from "zod";
import { getSupabase, storageBucket } from "../../lib/supabase";
import { ChatMatch, ChatMessage } from "./types";
import { invokeNotify } from "../../lib/notifications";

type MatchRow = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count?: number;
  other_profile?: {
    id: string;
    display_name: string;
    photos: Array<{ path: string }>;
  } | null;
};

type MessageRow = {
  id: string;
  match_id: string;
  sender: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
};

const signPhotos = async (photos: Array<{ path: string }> | null) => {
  if (!photos?.length) return [];
  const bucket = storageBucket("photos");
  const { data, error } = await bucket.createSignedUrls(
    photos.map((photo) => photo.path),
    3600,
  );
  if (error) throw error;
  return photos.map((photo, index) => ({
    path: photo.path,
    url: data?.[index]?.signedUrl ?? "",
  }));
};

const mapMatchRow = async (row: MatchRow, viewerId: string): Promise<ChatMatch> => {
  const otherProfile =
    row.other_profile && row.other_profile.id !== viewerId
      ? {
          id: row.other_profile.id,
          displayName: row.other_profile.display_name,
          photos: await signPhotos(row.other_profile.photos ?? []),
        }
      : undefined;

  return {
    id: row.id,
    userA: row.user_a,
    userB: row.user_b,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview ?? undefined,
    otherUserProfile: otherProfile,
    unreadCount: row.unread_count ?? 0,
  };
};

const mapMessageRow = (row: MessageRow): ChatMessage => ({
  id: row.id,
  matchId: row.match_id,
  senderId: row.sender,
  content: row.text ?? "",
  imageUrl: row.image_url ?? undefined,
  createdAt: row.created_at,
  readAt: row.read_at ?? undefined,
});

export const fetchMatches = async (viewerId: string): Promise<ChatMatch[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("list_matches_with_profiles", {
    p_viewer_id: viewerId,
  });
  if (error) throw error;
  const rows: MatchRow[] = data ?? [];
  return Promise.all(rows.map((row) => mapMatchRow(row, viewerId)));
};

export const fetchMessages = async (
  matchId: string,
  limit = 50,
): Promise<ChatMessage[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("messages")
    .select("id, match_id, sender, text, image_url, created_at, read_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapMessageRow);
};

const sendMessageSchema = z
  .object({
    matchId: z.string().min(1),
    senderId: z.string().min(1),
    receiverId: z.string().min(1).optional(),
    text: z.string().max(2000).optional(),
    imageUri: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.text?.trim() && !data.imageUri) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nachricht darf nicht leer sein.",
      });
    }
  });

export const sendMessage = async (input: {
  matchId: string;
  senderId: string;
  receiverId?: string;
  text?: string;
  imageUri?: string;
}): Promise<ChatMessage> => {
  const parsed = sendMessageSchema.parse(input);
  const trimmedText = parsed.text?.trim();

  let uploadedImage: string | undefined;
  if (parsed.imageUri) {
    const bucket = storageBucket("photos");
    const response = await fetch(parsed.imageUri);
    const blob = await response.blob();
    const path = `messages/${parsed.matchId}/${Date.now()}-${Math.round(Math.random() * 1_000_000)}.jpg`;
    const { error } = await bucket.upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    const { data, error: signedError } = await bucket.createSignedUrl(path, 3600);
    if (signedError || !data?.signedUrl)
      throw signedError ?? new Error("Bild konnte nicht freigegeben werden.");
    uploadedImage = data.signedUrl;
  }

  const supabase = getSupabase();
  const { data: abuseData, error: abuseError } = await supabase.functions.invoke(
    "abuse-check",
    {
      body: {
        userId: parsed.senderId,
        action: "message",
      },
    },
  );
  if (abuseError) throw abuseError;
  if (abuseData && abuseData.allow === false) {
    throw new Error(
      abuseData.reason ?? "Zu viele Nachrichten. Bitte versuche es in Kürze erneut.",
    );
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: parsed.matchId,
      sender: parsed.senderId,
      text: trimmedText ?? null,
      image_url: uploadedImage ?? null,
    })
    .select("id, match_id, sender, text, image_url, created_at, read_at")
    .single();
  if (error) throw error;
  const mapped = mapMessageRow(data);

  if (parsed.receiverId) {
    await invokeNotify({
      type: "message",
      matchId: parsed.matchId,
      receiverId: parsed.receiverId,
      actorId: parsed.senderId,
      preview: mapped.imageUrl ? "📷 Bild gesendet" : mapped.content,
    });
  }

  return mapped;
};

export const markMessagesRead = async (matchId: string, userId: string) => {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("mark_messages_read", {
    p_match_id: matchId,
    p_viewer_id: userId,
  });
  if (error) throw error;
};
