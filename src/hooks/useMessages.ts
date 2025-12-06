import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import {
  fetchMessages,
  flushQueuedMessages,
  subscribeToMessages,
  sendTypingEvent
} from "../services/matchService";
import { Message } from "../types";
import { useAuthStore } from "../state/authStore";
import { useNotificationsStore } from "../state/notificationsStore";
import { useChatStore } from "../state/chatStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const useMessages = (matchId: string) => {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const addNotification = useNotificationsStore((state) => state.addNotification);
  const setTyping = useChatStore((state) => state.setTyping);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const messagesQuery = useQuery({
    queryKey: ["messages", matchId],
    queryFn: () => fetchMessages(matchId),
    enabled: Boolean(matchId)
  });

  const [liveMessages, setLiveMessages] = useState<Message[]>([]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushQueuedMessages().catch((error) => {
          console.warn("Failed to flush queued messages", error);
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!matchId) {
      return;
    }
    flushQueuedMessages(matchId).catch((error) => {
      console.warn("Failed to flush match queue", error);
    });
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      return undefined;
    }
    const channel = subscribeToMessages(
      matchId,
      (message) => {
        setLiveMessages((prev) => {
          const exists = prev.find((item) => item.id === message.id);
          if (exists) {
            return prev;
          }
          return [message, ...prev];
        });
        queryClient.invalidateQueries({ queryKey: ["matches"] });
      },
      (isTyping) => {
        setTyping(matchId, isTyping);
      }
    );
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      setLiveMessages([]);
      channelRef.current = null;
    };
  }, [addNotification, matchId, queryClient, session?.user?.id, setLiveMessages, setTyping]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!matchId || !channelRef.current) return;
      sendTypingEvent(channelRef.current, matchId, isTyping);
    },
    [matchId]
  );

  const messages = [...liveMessages, ...(messagesQuery.data ?? [])];
  const uniqueMessages = Array.from(new Map(messages.map((message) => [message.id, message])).values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    messages: uniqueMessages,
    isLoading: messagesQuery.isLoading,
    refetch: messagesQuery.refetch,
    sendTyping
  };
};
