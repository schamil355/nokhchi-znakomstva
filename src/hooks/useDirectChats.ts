import { useQuery } from "@tanstack/react-query";
import { fetchDirectChats } from "../services/directChatService";
import { useAuthStore } from "../state/authStore";

export const useDirectChats = () => {
  const session = useAuthStore((state) => state.session);

  return useQuery({
    queryKey: ["directChats", session?.user?.id ?? null],
    queryFn: () => (session?.user?.id ? fetchDirectChats(session.user.id) : []),
    enabled: Boolean(session?.user?.id),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });
};
