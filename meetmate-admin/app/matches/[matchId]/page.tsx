import MatchViewer from "@/components/MatchViewer";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const MatchPage = async ({ params }: { params: { matchId: string } }) => {
  const supabase = getSupabaseServerClient();
  const matchPromise = supabase
    .from("matches_view")
    .select("*")
    .eq("id", params.matchId)
    .maybeSingle();
  const messagesPromise = supabase
    .from("messages_view")
    .select("*")
    .eq("match_id", params.matchId)
    .order("created_at", { ascending: true });

  const [{ data: match }, { data: messages }] = await Promise.all([matchPromise, messagesPromise]);

  return <MatchViewer match={match ?? null} messages={messages ?? []} />;
};

export default MatchPage;
