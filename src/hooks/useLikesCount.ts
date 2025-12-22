import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";

export const useLikesCount = () => {
  const session = useAuthStore((state) => state.session);
  const queryClient = useQueryClient();

  const likesQuery = useQuery({
    queryKey: ["likesCount", session?.user?.id ?? null],
    queryFn: async () => {
      if (!session?.user?.id) return 0;
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from("likes")
        .select("id", { count: "exact", head: true })
        .eq("likee_id", session.user.id);
      if (error) {
        throw error;
      }
      return count ?? 0;
    },
    enabled: Boolean(session?.user?.id),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true
  });

  useEffect(() => {
    if (!session?.user?.id) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`likes:${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes", filter: `likee_id=eq.${session.user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["likesCount", session.user.id] });
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, session?.user?.id]);

  return likesQuery;
};
