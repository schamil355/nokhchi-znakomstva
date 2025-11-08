import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSupabase } from "../../lib/supabase";
import { ChatMatch, ChatMessage } from "./types";
import { fetchMatches, fetchMessages, markMessagesRead, sendMessage } from "./api";
import { useSessionStore } from "../../store/sessionStore";

export const useMatches = () => {
  const session = useSessionStore((state) => state.session);
  return useQuery<ChatMatch[]>({
    queryKey: ["matches", session?.user.id],
    enabled: Boolean(session?.user.id),
    queryFn: () => fetchMatches(session!.user.id),
    staleTime: 20_000,
  });
};

export const useMessages = (matchId: string, otherUserId?: string) => {
  const session = useSessionStore((state) => state.session);
  const queryClient = useQueryClient();

  const result = useQuery<ChatMessage[]>({
    queryKey: ["messages", matchId],
    enabled: Boolean(matchId && session?.user.id),
    queryFn: () => fetchMessages(matchId),
  });

  useEffect(() => {
    if (!matchId || !session?.user.id) {
      return;
    }
    const supabase = getSupabase();
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (_payload) => {
          const message = _payload.new as any;
          queryClient.setQueryData<ChatMessage[]>(["messages", matchId], (prev = []) => {
            const mapped: ChatMessage = {
              id: message.id,
              matchId: message.match_id,
              senderId: message.sender,
              content: message.text ?? "",
              imageUrl: message.image_url ?? undefined,
              createdAt: message.created_at,
              readAt: message.read_at ?? undefined,
            };
            const exists = prev.find((item) => item.id === mapped.id);
            if (exists) return prev;
            return [mapped, ...prev];
          });
          queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
        },
      )
      .on("broadcast", { event: "typing" }, (_payload) => {
        // typing handled in component via callback
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient, session?.user.id]);

  useEffect(() => {
    if (matchId && session?.user.id) {
      void markMessagesRead(matchId, session.user.id);
      queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
    }
  }, [matchId, queryClient, session?.user.id, otherUserId]);

  return result;
};

export const useSendMessage = (matchId: string, receiverId?: string) => {
  const session = useSessionStore((state) => state.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ text, imageUri }: { text?: string; imageUri?: string }) => {
      if (!session?.user.id) throw new Error("Nicht eingeloggt");
      return sendMessage({
        matchId,
        senderId: session.user.id,
        receiverId,
        text,
        imageUri,
      });
    },
    onMutate: async ({ text, imageUri }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", matchId] });
      const optimistic: ChatMessage = {
        id: `local-${Date.now()}`,
        matchId,
        senderId: session!.user.id,
        content: text ?? "",
        imageUrl: imageUri,
        createdAt: new Date().toISOString(),
        optimistic: true,
      };
      const previous =
        queryClient.getQueryData<ChatMessage[]>(["messages", matchId]) ?? [];
      queryClient.setQueryData<ChatMessage[]>(
        ["messages", matchId],
        [optimistic, ...previous],
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["messages", matchId], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches", session?.user.id] });
    },
  });
};

export const sendTypingEvent = (matchId: string, value: boolean) => {
  const supabase = getSupabase();
  supabase.channel(`typing:${matchId}`).send({
    type: "broadcast",
    event: "typing",
    payload: { matchId, typing: value },
  });
};
