"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SUPABASE_ENABLED } from "@/lib/env";
import { formatDateISO } from "@/lib/date";

const DEMO_VIEWER_ID = "00000000-0000-0000-0000-000000000001";

type Match = {
  id: string;
  user_a: string;
  user_b: string;
  created_at?: string;
  last_message_at?: string | null;
  user_a_profile?: { id: string; display_name?: string | null; verified_at?: string | null } | null;
  user_b_profile?: { id: string; display_name?: string | null; verified_at?: string | null } | null;
};

const MOCK_MATCHES: Match[] = [
  {
    id: "mock-match-1",
    user_a: DEMO_VIEWER_ID,
    user_b: "mock-user-2",
    created_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
    user_a_profile: { id: DEMO_VIEWER_ID, display_name: "Du", verified_at: null },
    user_b_profile: { id: "mock-user-2", display_name: "Leyla, 28", verified_at: new Date().toISOString() }
  },
  {
    id: "mock-match-2",
    user_a: "mock-user-3",
    user_b: DEMO_VIEWER_ID,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    last_message_at: null,
    user_a_profile: { id: "mock-user-3", display_name: "Mina, 31" },
    user_b_profile: { id: DEMO_VIEWER_ID, display_name: "Du" }
  }
];

const getDisplayName = (match: Match, viewerId: string) => {
  const otherProfile =
    match.user_a === viewerId ? match.user_b_profile : match.user_a_profile;
  return otherProfile?.display_name ?? "Unbekanntes Match";
};

export default function MatchesPage() {
  const [viewerId] = useState(DEMO_VIEWER_ID);
  const [matches, setMatches] = useState<Match[]>(() => (SUPABASE_ENABLED ? [] : MOCK_MATCHES));
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    SUPABASE_ENABLED ? "loading" : "idle"
  );

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    let cancelled = false;
    const fetchMatches = async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/matches?uid=${viewerId}`);
        if (!res.ok) throw new Error(`Matches request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setMatches(data.items ?? []);
          setStatus("idle");
        }
      } catch (error) {
        console.warn("Failed to load matches", error);
        if (!cancelled) {
          setMatches(MOCK_MATCHES);
          setStatus("error");
        }
      }
    };

    fetchMatches();
    return () => {
      cancelled = true;
    };
  }, [viewerId]);

  const subtitle = useMemo(() => {
    if (status === "loading") return "Lade deine Matches …";
    if (!SUPABASE_ENABLED) return "Demo-Matches – Supabase nicht verbunden.";
    if (status === "error") return "Offline-Demo – wir konnten deine Matches nicht laden.";
    return `${matches.length} Matches gefunden`;
  }, [matches.length, status]);

  return (
    <section className="px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-[var(--text)]">Matches</h1>
          <p className="text-sm text-[var(--muted)]">{subtitle}</p>
        </header>

        <div className="space-y-4">
          {matches.map((match) => {
            const otherName = getDisplayName(match, viewerId);
            return (
              <Link
                key={match.id}
                href={`/chat/${match.id}`}
                className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-[var(--text)]">{otherName}</div>
                    <div className="text-xs text-[var(--muted)]">
                      Match seit {formatDateISO(match.created_at ?? Date.now())}
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--primary-100)] px-3 py-1 text-xs text-[var(--primary-600)]">
                    Chat öffnen
                  </span>
                </div>
              </Link>
            );
          })}
          {matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
              Noch keine Matches – starte im Discover-Tab!
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
