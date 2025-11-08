import ReportTable from "@/components/ReportTable";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const DashboardPage = async () => {
  const supabase = getSupabaseServerClient();
  const { data: reports } = await supabase
    .from("reports_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400">Recent reports and moderation activity.</p>
      </header>
      <ReportTable reports={reports ?? []} />
    </section>
  );
};

export default DashboardPage;
