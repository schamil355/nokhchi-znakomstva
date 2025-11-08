"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";

const UsersPage = () => {
  const [results, setResults] = useState<Array<{ id: string; email: string | null; display_name: string | null; created_at: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setError(null);
    const res = await fetch("/api/admin/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "Search failed");
      setResults([]);
      return;
    }
    setResults(payload.data ?? []);
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">User search</h1>
        <p className="text-sm text-slate-400">Find users by email or display name.</p>
      </header>
      <SearchForm onSubmit={handleSearch} />
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Display name</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {results.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3 text-slate-100">{row.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">{row.display_name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-400">{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {results.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No results yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default UsersPage;
