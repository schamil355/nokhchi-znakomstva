"use client";

import { useState } from "react";
import type { Database } from "@/lib/types";

type ReportRow = Database["public"]["Tables"]["reports_view"]["Row"];

type ReportTableProps = {
  reports: ReportRow[];
  showFilters?: boolean;
};

const ReportTable = ({ reports, showFilters = false }: ReportTableProps) => {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleModeration = async (targetEmail: string | null, action: "ban" | "unban") => {
    setError(null);
    if (!targetEmail) {
      setError("No target email specified.");
      return;
    }
    setSubmitting(`${action}:${targetEmail}`);
    const res = await fetch("/api/admin/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: targetEmail, action })
    });
    setSubmitting(null);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error ?? "Operation failed");
    }
  };

  return (
    <div className="space-y-3">
      {showFilters ? <p className="text-sm text-slate-400">Showing latest reports.</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Reported</th>
              <th className="px-4 py-3 text-left">Reporter</th>
              <th className="px-4 py-3 text-left">Reason</th>
              <th className="px-4 py-3 text-left">Details</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{report.reported_name ?? "Unknown"}</div>
                  <div className="text-xs text-slate-400">{report.reported_email ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{report.reporter_name ?? "Unknown"}</div>
                  <div className="text-xs text-slate-400">{report.reporter_email ?? "—"}</div>
                </td>
                <td className="px-4 py-3">{report.reason ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{report.details ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">
                  {new Date(report.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {report.match_id ? (
                      <a
                        href={`/matches/${report.match_id}`}
                        className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        View match
                      </a>
                    ) : null}
                    <button
                      onClick={() => handleModeration(report.reported_email, "ban")}
                      disabled={submitting !== null}
                      className="rounded-md bg-rose-500 px-3 py-1 text-xs font-semibold text-slate-950 disabled:opacity-60"
                    >
                      {submitting === `ban:${report.reported_email}` ? "Banning…" : "Ban"}
                    </button>
                    <button
                      onClick={() => handleModeration(report.reported_email, "unban")}
                      disabled={submitting !== null}
                      className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 disabled:opacity-60"
                    >
                      {submitting === `unban:${report.reported_email}` ? "Unbanning…" : "Unban"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No reports found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportTable;
