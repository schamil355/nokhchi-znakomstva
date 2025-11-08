"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const LoginPage = () => {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectedFrom") ?? "/";
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(form);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(redirectTo);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-slate-900/70 px-6 py-8 shadow-xl"
      >
        <h1 className="text-xl font-semibold">meetmate Admin</h1>
        <p className="text-sm text-slate-400">Sign in with your admin credentials.</p>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="mt-1 w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="mt-1 w-full rounded-md bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-500 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
};

export default LoginPage;
