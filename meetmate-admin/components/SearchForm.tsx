"use client";

import { useState } from "react";

type SearchFormProps = {
  onSubmit: (query: string) => Promise<void>;
};

const SearchForm = ({ onSubmit }: SearchFormProps) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setError("Please enter at least two characters.");
      return;
    }
    setError(null);
    setLoading(true);
    await onSubmit(query.trim());
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <label className="flex-1 text-sm">
        Search term
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1 w-full rounded-md bg-slate-800 px-3 py-2 text-slate-100"
          placeholder="Email or display name…"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
      >
        {loading ? "Searching…" : "Search"}
      </button>
      {error ? <p className="w-full text-sm text-rose-400">{error}</p> : null}
    </form>
  );
};

export default SearchForm;
