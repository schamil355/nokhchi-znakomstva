"use client";

import { useRouter } from "next/navigation";
import RegionFilterPanel from "@/components/RegionFilterPanel";

export default function FiltersPage() {
  const router = useRouter();

  return (
    <section className="px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-[var(--text)]">Filter</h1>
          <p className="text-sm text-[var(--muted)]">
            Wähle deine Zielregion für Discovery.
          </p>
        </header>

        <RegionFilterPanel onSaved={() => router.push("/discover")} />
      </div>
    </section>
  );
}
