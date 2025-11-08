"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SUPABASE_ENABLED } from "@/lib/env";
import { formatTime } from "@/lib/date";

const DEMO_VIEWER_ID = "00000000-0000-0000-0000-000000000001";

type Match = {
  id: string;
  user_a: string;
  user_b: string;
  user_a_profile?: { id: string; display_name?: string | null; verified_at?: string | null } | null;
  user_b_profile?: { id: string; display_name?: string | null; verified_at?: string | null } | null;
};

type Message = {
  id: number | string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const MOCK_MATCH: Match = {
  id: "mock-match-1",
  user_a: DEMO_VIEWER_ID,
  user_b: "mock-user-2",
  user_a_profile: { id: DEMO_VIEWER_ID, display_name: "Du", verified_at: null },
  user_b_profile: { id: "mock-user-2", display_name: "Leyla, 28", verified_at: new Date().toISOString() }
};

const MOCK_MESSAGES: Message[] = [
  {
    id: 1,
    match_id: "mock-match-1",
    sender_id: DEMO_VIEWER_ID,
    content: "Hey Leyla! Wie war dein Tag?",
    created_at: new Date(Date.now() - 3600_000).toISOString()
  },
  {
    id: 2,
    match_id: "mock-match-1",
    sender_id: "mock-user-2",
    content: "Hi! Sehr gut, war gerade im Kletterpark. Und deiner?",
    created_at: new Date(Date.now() - 3200_000).toISOString()
  }
];

const getOtherProfileName = (match: Match | null, viewerId: string) => {
  if (!match) return "Match";
  const other = match.user_a === viewerId ? match.user_b_profile : match.user_a_profile;
  return other?.display_name ?? "Match";
};

export default function ChatThreadPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const [viewerId] = useState(DEMO_VIEWER_ID);
  const [match, setMatch] = useState<Match | null>(() =>
    SUPABASE_ENABLED ? null : MOCK_MATCH
  );
  const [messages, setMessages] = useState<Message[]>(() =>
    SUPABASE_ENABLED ? [] : MOCK_MESSAGES
  );
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "forbidden" | "error">(
    SUPABASE_ENABLED ? "loading" : "idle"
  );

  const matchId = params.matchId;

  const fetchMatch = useCallback(async () => {
    if (!SUPABASE_ENABLED) return;
    try {
      const res = await fetch(`/api/matches?uid=${viewerId}`);
      if (!res.ok) throw new Error(`matches ${res.status}`);
      const data = (await res.json()) as { items: Match[] };
      const found = data.items?.find((item) => item.id === matchId) ?? null;
      if (!found) {
        setStatus("forbidden");
        return;
      }
      setMatch(found);
    } catch (error) {
      console.warn("fetchMatch failed", error);
    }
  }, [matchId, viewerId]);

  const fetchMessages = useCallback(async () => {
    if (!SUPABASE_ENABLED) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/messages?match_id=${matchId}`);
      if (res.status === 401 || res.status === 403) {
        setStatus("forbidden");
        return;
      }
      if (!res.ok) throw new Error(`messages ${res.status}`);
      const data = await res.json();
      setMessages(data.items ?? []);
      setStatus("idle");
    } catch (error) {
      console.warn("fetchMessages failed", error);
      setStatus("error");
    }
  }, [matchId]);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;
    fetchMatch();
  }, [fetchMatch]);

useEffect(() => {
  if (!SUPABASE_ENABLED) return;
  fetchMessages();
  const interval = setInterval(fetchMessages, 5000);
  return () => clearInterval(interval);
}, [fetchMessages]);

  const viewerProfile = match
    ? match.user_a === viewerId
      ? match.user_a_profile
      : match.user_b_profile
    : null;
  const isVerified = Boolean(viewerProfile?.verified_at);
  const showGate = !isVerified;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;
    if (showGate) return;

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      match_id: matchId,
      sender_id: viewerId,
      content: input.trim(),
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    if (!SUPABASE_ENABLED) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          sender_id: viewerId,
          content: optimistic.content
        })
      });
      if (!res.ok) {
        throw new Error(`send message ${res.status}`);
      }
      // refresh to replace optimistic entry with canonical data
      fetchMessages();
    } catch (error) {
      console.warn("send message failed", error);
      setStatus("error");
    }
  };

  const title = useMemo(() => getOtherProfileName(match, viewerId), [match, viewerId]);

  if (status === "forbidden") {
    return (
      <section className="px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-[var(--muted)]">
          Dieser Chat ist nicht verfügbar. <button onClick={() => router.push("/matches")} className="text-[var(--primary-600)] underline">Zurück zu Matches</button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10">
      <div className="mx-auto flex h-[calc(100vh-160px)] max-w-2xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <header className="border-b border-[var(--border)] px-6 py-4">
          <h1 className="text-xl font-semibold text-[var(--text)]">{title}</h1>
          <p className="text-xs text-[var(--muted)]">
            {status === "loading" ? "Nachrichten werden geladen ..." : "Ihr könnt jetzt chatten."}
          </p>
        </header>

        {showGate ? (
          <div className="mx-6 mt-4 rounded-2xl border border-[var(--border)] bg-[var(--primary-50)] px-4 py-3 text-sm text-[var(--text)]">
            <div className="font-semibold">Verifizierung erforderlich</div>
            <p className="mt-1 text-[var(--muted)]">
              Bitte verifiziere dein Profil, bevor du chatten kannst. Dadurch schützen wir alle Nutzer:innen.
            </p>
            <Link
              href="/verification"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-[var(--primary-600)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
            >
              Jetzt verifizieren
            </Link>
          </div>
        ) : null}

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === viewerId;
            return (
              <div
                key={message.id}
                className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                  isOwn
                    ? "ml-auto bg-[var(--primary-600)] text-white"
                    : "bg-white text-[var(--text)] border border-[var(--border)]"
                }`}
              >
            <div className="text-[10px] opacity-70">
                  {formatTime(message.created_at)}
                </div>
                <div>{message.content}</div>
              </div>
            );
          })}
          {messages.length === 0 && status !== "loading" ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-4 py-6 text-center text-xs text-[var(--muted)]">
              Noch keine Nachrichten – sag Hallo!
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nachricht schreiben …"
              disabled={showGate}
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={showGate}
              className="rounded-xl bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Senden
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
