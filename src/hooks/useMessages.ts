import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { fetchMessages, flushQueuedMessages, subscribeToMessages } from "../services/matchService";
import { Message } from "../types";

export const useMessages = (matchId: string) => {
  const queryClient = useQueryClient();

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
        // typing handled in store via service
        console.log("typing event", isTyping);
      }
    );

    return () => {
      channel.unsubscribe();
      setLiveMessages([]);
    };
  }, [matchId, queryClient]);

  const messages = [...liveMessages, ...(messagesQuery.data ?? [])];
  const uniqueMessages = Array.from(new Map(messages.map((message) => [message.id, message])).values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    messages: uniqueMessages,
    isLoading: messagesQuery.isLoading,
    refetch: messagesQuery.refetch
  };
};
