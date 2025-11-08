"use client";

import { useState } from "react";

const COLOR_TOKENS = [
  { name: "Primary 600", varName: "--primary-600" },
  { name: "Primary 400", varName: "--primary-400" },
  { name: "Accent 600", varName: "--accent-600" },
  { name: "Accent 100", varName: "--accent-100" }
];

const CARD_PREVIEWS = [
  { title: "Sicheres Dating", description: "Verifizierte Profile + Community-Reporting" },
  { title: "Premium Swipe", description: "Boost, Super-Likes und Ranking" },
  { title: "Realtime Chat", description: "Typing-Status & Lesebestätigungen" }
];

export default function ThemePreviewPage() {
  const [dark, setDark] = useState(false);

  return (
    <div className={dark ? "theme-dark" : ""}>
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-10">
          <header className="rounded-3xl bg-[var(--surface)] px-6 py-8 shadow-[var(--shadow-sm)] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Theme</p>
              <h1 className="text-3xl font-semibold text-[var(--text)]">meetmate Green / dua-inspired</h1>
              <p className="text-sm text-[var(--muted)]">
                Tokens, Buttons und Cards nutzen weiche Neumorph-Schatten und pillige Formen – modern, aber eigenständig.
              </p>
            </div>
            <button
              className="pill-button pill-button--ghost"
              onClick={() => setDark((prev) => !prev)}
            >
              {dark ? "☾ Dark Mode" : "☀︎ Light Mode"}
            </button>
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="glass-card">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Buttons & Chips</h2>
              <div className="flex flex-wrap gap-3">
                <button className="pill-button pill-button--primary">Jetzt entdecken</button>
                <button className="pill-button pill-button--ghost">Demo ansehen</button>
                <span className="chip">Premium Badge</span>
                <span className="chip" style={{ background: "rgba(109,40,217,0.1)", color: "var(--accent-600)" }}>
                  Safety First
                </span>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <div className={`toggle-control${dark ? " is-active" : ""}`} onClick={() => setDark((prev) => !prev)} />
                <span className="text-sm text-[var(--muted)]">Live Theme Toggle</span>
              </div>
            </div>

            <div className="glass-card">
              <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Farben</h2>
              <div className="grid gap-3">
                {COLOR_TOKENS.map((token) => (
                  <div key={token.varName} className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-2xl border border-[var(--border)]"
                      style={{ background: `var(${token.varName})` }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{token.name}</div>
                      <div className="text-xs text-[var(--muted)]">{token.varName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {CARD_PREVIEWS.map((card) => (
              <div key={card.title} className="glass-card flex flex-col gap-3 shadow-[var(--shadow-lg)]">
                <div className="text-sm text-[var(--muted)] uppercase tracking-wide">{card.title}</div>
                <div className="text-xl font-semibold text-[var(--text)]">{card.description}</div>
                <button className="pill-button pill-button--primary w-full">Mehr erfahren</button>
              </div>
            ))}
          </section>

          <section className="glass-card">
            <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Swipe Deck Vorschau</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
                  <div className="h-48 rounded-2xl bg-[var(--primary-100)] mb-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-[var(--text)]">Nura, {26 + idx}</div>
                      <div className="text-xs text-[var(--muted)]">3 km entfernt</div>
                    </div>
                    <span className="chip">Verifiziert</span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Journalistin, reist mit Kamera und liebt Rooftop-Cafés in neuen Städten.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 pill-button pill-button--ghost">Pass</button>
                    <button className="flex-1 pill-button pill-button--primary">Like</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
