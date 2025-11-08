"use client";

import type { Database } from "@/lib/types";

type BlockRow = Database["public"]["Tables"]["blocks_view"]["Row"];

type BlockTableProps = {
  rows: BlockRow[];
};

const BlockTable = ({ rows }: BlockTableProps) => (
  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
    <table className="w-full text-sm">
      <thead className="bg-slate-900 text-slate-400">
        <tr>
          <th className="px-4 py-3 text-left">Blocker</th>
          <th className="px-4 py-3 text-left">Blocked</th>
          <th className="px-4 py-3 text-left">Created</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {rows.map((row, idx) => (
          <tr key={`${row.blocker_email}-${row.blocked_email}-${idx}`} className="hover:bg-slate-800/40">
            <td className="px-4 py-3">
              <div className="font-medium text-slate-100">{row.blocker_name ?? "Unknown"}</div>
              <div className="text-xs text-slate-400">{row.blocker_email ?? "—"}</div>
            </td>
            <td className="px-4 py-3">
              <div className="font-medium text-slate-100">{row.blocked_name ?? "Unknown"}</div>
              <div className="text-xs text-slate-400">{row.blocked_email ?? "—"}</div>
            </td>
            <td className="px-4 py-3 text-slate-400">
              {new Date(row.created_at).toLocaleString()}
            </td>
          </tr>
        ))}
        {rows.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
              No blocks recorded.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  </div>
);

export default BlockTable;
