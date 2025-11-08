import ReportTable from "@/components/ReportTable";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const ReportsPage = async () => {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("reports_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">Reports</h1>
        <p className="text-sm text-slate-400">Latest moderation reports.</p>
      </header>
      <ReportTable reports={data ?? []} showFilters />
    </section>
  );
};

export default ReportsPage;
