import BlockTable from "@/components/BlockTable";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const BlocksPage = async () => {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("blocks_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">Blocks</h1>
        <p className="text-sm text-slate-400">All recent block actions.</p>
      </header>
      <BlockTable rows={data ?? []} />
    </section>
  );
};

export default BlocksPage;
