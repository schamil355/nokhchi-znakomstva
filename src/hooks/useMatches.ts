import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fetchMatches, sendMessage } from "../services/matchService";
import { useAuthStore } from "../state/authStore";

export const useMatches = () => {
  const session = useAuthStore((state) => state.session);
  return useQuery({
    queryKey: ["matches", session?.user.id],
    queryFn: () => (session ? fetchMatches(session.user.id) : []),
    enabled: Boolean(session),
    refetchInterval: 20_000
  });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matches", session?.user.id] });
    }
  });
};
