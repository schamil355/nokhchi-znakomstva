"use client";

import Link from "next/link";
import RegionFilterPanel from "@/components/RegionFilterPanel";

const tabClass = (active: boolean) =>
  [
    "rounded-full border px-3 py-1 text-sm font-semibold transition",
    active
      ? "border-[var(--primary-500)] bg-[var(--primary-100)] text-[var(--primary-700)]"
      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
  ].join(" ");

export default function RegionSettingsPage() {
  return (
    <section className="px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-[var(--text)]">Suchregion</h1>
          <p className="text-sm text-[var(--muted)]">
            Wähle, wo wir nach Matches suchen sollen.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2">
          <Link href="/settings/privacy" className={tabClass(false)}>
            Privatsphäre
          </Link>
          <Link href="/settings/region" className={tabClass(true)} aria-current="page">
            Suchregion
          </Link>
        </nav>

        <RegionFilterPanel />
      </div>
    </section>
  );
}
