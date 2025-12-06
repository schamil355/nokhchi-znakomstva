import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchMatches, sendMessage } from "../services/matchService";
import { useAuthStore } from "../state/authStore";
import { Message } from "../types";
import { getSupabaseClient } from "../lib/supabaseClient";

export const useMatches = () => {
  const session = useAuthStore((state) => state.session);
  const viewerIsIncognito = useAuthStore((state) => state.profile?.isIncognito);
  const queryClient = useQueryClient();

  const matchesQuery = useQuery({
    queryKey: ["matches", session?.user.id],
    queryFn: () => (session ? fetchMatches(session.user.id, { viewerIsIncognito }) : []),
    enabled: Boolean(session),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  useEffect(() => {
    if (session?.user?.id && viewerIsIncognito !== undefined) {
      queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
    }
  }, [queryClient, session?.user?.id, viewerIsIncognito]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const supabase = getSupabaseClient();

    const handleMatchNotification = async () => {
      queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
    };

    const matchChannel = supabase.channel(`matches:${session.user.id}`);
    matchChannel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user_a=eq.${session.user.id}` },
        async (payload) => {
          const other = (payload.new as any)?.user_b as string | undefined;
          if (!other) return;
          await handleMatchNotification();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user_b=eq.${session.user.id}` },
        async (payload) => {
          const other = (payload.new as any)?.user_a as string | undefined;
          if (!other) return;
          await handleMatchNotification();
        }
      )
      .subscribe();

    const messageChannel = supabase
      .channel(`messages:${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (!msg?.match_id) return;
          if (msg.sender_id === session.user.id) return;
          queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
        }
      )
      .subscribe();

    return () => {
      matchChannel.unsubscribe();
      messageChannel.unsubscribe();
    };
  }, [queryClient, session?.user?.id]);

  return matchesQuery;
};

export const useSendMessage = (matchId: string) => {
  const session = useAuthStore((state) => state.session);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => {
      if (!session) {
        throw new Error("Nicht eingeloggt");
      }
      return sendMessage(matchId, session.user.id, content);
    },
    onMutate: async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !session) return;
      await queryClient.cancelQueries({ queryKey: ["messages", matchId] });
      const previous = queryClient.getQueryData<Message[]>(["messages", matchId]) ?? [];
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        matchId,
        senderId: session.user.id,
        content: trimmed,
        createdAt: new Date().toISOString()
      };
      queryClient.setQueryData<Message[]>(["messages", matchId], [...previous, optimistic]);
      return { previous, optimistic };
    },
    onError: (_error, _content, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["messages", matchId], context.previous);
      }
    },
    onSuccess: (message, _content, context) => {
      if (context?.previous) {
        const current = queryClient.getQueryData<Message[]>(["messages", matchId]) ?? [];
        const withoutOptimistic = current.filter((item) => item.id !== context.optimistic?.id);
        queryClient.setQueryData<Message[]>(["messages", matchId], [...withoutOptimistic, message]);
      }
      queryClient.invalidateQueries({ queryKey: ["matches", session?.user.id] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
    }
  });
};
