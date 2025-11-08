"use client";

import { useEffect, useState, useTransition } from "react";

type Flags = {
  is_incognito: boolean;
  show_distance: boolean;
  show_last_seen: boolean;
};

const defaultFlags: Flags = {
  is_incognito: false,
  show_distance: true,
  show_last_seen: true
};

const ToggleRow = ({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) => (
  <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 flex items-center justify-between gap-4">
    <div>
      <p className="text-[var(--text)] font-semibold">{label}</p>
      <p className="text-sm text-[var(--muted)]">{description}</p>
    </div>
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={`toggle-control${value ? " is-active" : ""}`}
    />
  </div>
);

export default function PrivacySettingsPage() {
  const [flags, setFlags] = useState<Flags>(defaultFlags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const fetchFlags = async () => {
      try {
        const response = await fetch("/api/settings/privacy");
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }
        const data = (await response.json()) as Flags;
        if (!cancelled) {
          setFlags({
            is_incognito: data.is_incognito,
            show_distance: data.show_distance,
            show_last_seen: data.show_last_seen
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Privacy load failed", err);
          setError("Einstellungen konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFlags();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchFlags = (patch: Partial<Flags>) => {
    setFlags((prev) => ({ ...prev, ...patch }));
    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/privacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (!response.ok) {
          throw new Error();
        }
      } catch {
        setError("Speichern fehlgeschlagen");
      }
    });
  };

  return (
    <section className="px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header>
          <h1 className="text-3xl font-semibold text-[var(--text)]">Privatsphäre</h1>
          <p className="text-sm text-[var(--muted)]">Steuere, wie du in Discovery angezeigt wirst.</p>
        </header>

        {(loading || isPending) && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
            Aktualisiere Einstellungen …
          </div>
        )}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <ToggleRow
          label="Incognito-Modus"
          description="Nur Profile, die du geliked hast oder Matches, sehen dich."
          value={flags.is_incognito}
          onChange={(next) => patchFlags({ is_incognito: next })}
        />

        <ToggleRow
          label="Distanz anzeigen"
          description="Blende deine Entfernung in Discovery ein/aus."
          value={flags.show_distance}
          onChange={(next) => patchFlags({ show_distance: next })}
        />

        <ToggleRow
          label="Zuletzt online"
          description="Steuere, ob andere dein letztes Online sehen."
          value={flags.show_last_seen}
          onChange={(next) => patchFlags({ show_last_seen: next })}
        />
      </div>
    </section>
  );
}
