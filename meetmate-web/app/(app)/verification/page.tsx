"use client";

export default function VerificationPage() {
  return (
    <section className="px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-[var(--text)]">Profil verifizieren</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Für Premium-Funktionen wie Chat oder Boosts benötigen wir eine kurze Verifizierung. Halte ein Ausweisdokument und
          ein Selfie bereit. Das dauert weniger als zwei Minuten.
        </p>
        <ol className="mt-6 space-y-4 text-sm text-[var(--text)]">
          <li className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <strong>1. Dokument prüfen:</strong> Lade die Vorder- und Rückseite deines Ausweises hoch.
          </li>
          <li className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <strong>2. Selfie aufnehmen:</strong> Kurzes Video oder Selfie, damit wir sicherstellen, dass du echt bist.
          </li>
          <li className="rounded-2xl bg-white px-4 py-3 shadow-sm">
            <strong>3. Ergebnis:</strong> Du erhältst sofort das „Verifiziert“-Badge und kannst chatten.
          </li>
        </ol>
        <a
          href="https://app.meetmate.com/verify"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--primary-600)] px-4 py-3 text-sm font-semibold text-white hover:brightness-110"
        >
          Verifizierung starten
        </a>
      </div>
    </section>
  );
}
