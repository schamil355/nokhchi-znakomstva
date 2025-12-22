import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDirectMessages, sendDirectMessage, subscribeToDirectMessages } from "../services/directChatService";
import { DirectMessage } from "../types";
import { useAuthStore } from "../state/authStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const useDirectMessages = (conversationId: string) => {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const [liveMessages, setLiveMessages] = useState<DirectMessage[]>([]);
  const messagesQuery = useQuery({
    queryKey: ["directMessages", session?.user?.id ?? null, conversationId],
    queryFn: () => (session ? fetchDirectMessages(conversationId) : []),
    enabled: Boolean(conversationId && session?.user?.id)
  });

  useEffect(() => {
    if (!conversationId || !session?.user?.id) {
      return undefined;
    }
    const channel: RealtimeChannel = subscribeToDirectMessages(conversationId, (message) => {
      setLiveMessages((prev) => {
        const exists = prev.find((item) => item.id === message.id);
        if (exists) return prev;
        return [message, ...prev];
      });
      queryClient.invalidateQueries({ queryKey: ["directChats", session.user.id] });
    });
    return () => {
      channel.unsubscribe();
      setLiveMessages([]);
    };
  }, [conversationId, queryClient, session?.user?.id]);

  const messages = [...liveMessages, ...(messagesQuery.data ?? [])];
  const uniqueMessages = Array.from(new Map(messages.map((m) => [m.id, m])).values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const send = async (content: string) => {
    if (!session?.user?.id) throw new Error("Nicht eingeloggt");
    const msg = await sendDirectMessage(conversationId, session.user.id, content);
    setLiveMessages((prev) => {
      const exists = prev.find((m) => m.id === msg.id);
      if (exists) return prev;
      return [msg, ...prev];
    });
    queryClient.invalidateQueries({ queryKey: ["directChats", session.user.id] });
    return msg;
  };

  return {
    messages: uniqueMessages,
    isLoading: messagesQuery.isLoading,
    refetch: messagesQuery.refetch,
    sendMessage: send
  };
};
