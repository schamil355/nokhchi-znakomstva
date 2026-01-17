"use client";

import { useEffect, useState } from "react";
import type { GeoRegion } from "@/lib/geoRegion";
import { getStoredRegion, setStoredRegion } from "@/lib/regionPreference";

const DEFAULT_REGION: GeoRegion = "chechnya";

const REGION_OPTIONS: Array<{ value: GeoRegion; label: string; description: string }> = [
  {
    value: "chechnya",
    label: "Tschetschenien",
    description: "Finde Profile in Tschetschenien."
  },
  {
    value: "russia",
    label: "Russland",
    description: "Finde Profile in der gesamten Russischen Föderation."
  },
  {
    value: "europe",
    label: "Europa",
    description: "Finde Profile im EU-Basis-Set."
  },
  {
    value: "other",
    label: "Andere Regionen",
    description: "Finde Profile außerhalb Europas und Russlands."
  }
];

const EUROPE_COUNTRIES = ["FR", "DE", "AT", "BE", "NO"];
const RUSSIA_CITIES = ["Moskau", "Sankt Petersburg", "Kasan", "Nowosibirsk"];

type Props = {
  onSaved?: () => void;
};

export default function RegionFilterPanel({ onSaved }: Props) {
  const [selection, setSelection] = useState<GeoRegion>(DEFAULT_REGION);
  const [current, setCurrent] = useState<GeoRegion>(DEFAULT_REGION);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredRegion();
    if (stored) {
      setSelection(stored);
      setCurrent(stored);
    }
  }, []);

  const handleSelect = (value: GeoRegion) => {
    setSelection(value);
    setNotice(null);
  };

  const handleSave = () => {
    setStoredRegion(selection);
    setCurrent(selection);
    setNotice("Filter aktualisiert.");
    onSaved?.();
  };

  const canSave = selection !== current;

  return (
    <>
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Region">
          {REGION_OPTIONS.map((option) => {
            const active = option.value === selection;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleSelect(option.value)}
                className={[
                  "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                  active
                    ? "border-[var(--primary-400)] bg-[var(--primary-50)]"
                    : "border-transparent hover:border-[var(--border)]"
                ].join(" ")}
              >
                <span
                  className={[
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-[var(--primary-600)]" : "border-[var(--border)]"
                  ].join(" ")}
                >
                  {active ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary-600)]" />
                  ) : null}
                </span>
                <span>
                  <span className="block text-[var(--text)] font-semibold">
                    {option.label}
                  </span>
                  <span className="block text-sm text-[var(--muted)]">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <RegionPreview mode={selection} />

      <button
        type="button"
        className="pill-button pill-button--primary w-full"
        onClick={handleSave}
        disabled={!canSave}
        aria-disabled={!canSave}
      >
        Speichern
      </button>
    </>
  );
}

const RegionPreview = ({ mode }: { mode: GeoRegion }) => {
  if (mode === "chechnya") return <ChechnyaPreview />;
  if (mode === "europe") return <EuropePreview />;
  if (mode === "russia") return <RussiaPreview />;
  return <OtherPreview />;
};

const cardClass =
  "rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 flex flex-col gap-3";

const ChechnyaPreview = () => (
  <div className={cardClass}>
    <p className="text-lg font-semibold text-[var(--text)]">Fokus Tschetschenien</p>
    <div className="relative h-40 overflow-hidden rounded-2xl border border-[var(--border)]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 30%, rgba(16,185,129,0.35), transparent 60%), radial-gradient(circle at 70% 70%, rgba(109,40,217,0.18), transparent 65%)"
        }}
      />
      <div
        className="absolute left-6 top-6 h-16 w-16 rounded-full border-2 border-[var(--primary-600)]"
        style={{ background: "rgba(16,185,129,0.2)" }}
      />
      <div
        className="absolute bottom-4 right-4 rounded-full px-3 py-1 text-xs text-[var(--text)]"
        style={{ background: "rgba(255,255,255,0.9)" }}
      >
        Grozny +/- 130 km
      </div>
    </div>
    <p className="text-sm text-[var(--muted)]">
      Matches aus der Region rund um Grozny.
    </p>
  </div>
);

const EuropePreview = () => (
  <div className={cardClass}>
    <p className="text-lg font-semibold text-[var(--text)]">Europa</p>
    <div className="flex flex-wrap gap-2">
      {EUROPE_COUNTRIES.map((code) => (
        <span key={code} className="chip">
          {code}
        </span>
      ))}
    </div>
    <p className="text-sm text-[var(--muted)]">
      Erweiterte Suche im EU-Basis-Set.
    </p>
  </div>
);

const RussiaPreview = () => (
  <div className={cardClass}>
    <p className="text-lg font-semibold text-[var(--text)]">Ganz Russland</p>
    <div className="flex flex-wrap gap-2">
      {RUSSIA_CITIES.map((city) => (
        <span key={city} className="chip">
          {city}
        </span>
      ))}
    </div>
    <p className="text-sm text-[var(--muted)]">
      Umfasst verifizierte Accounts in der gesamten Russischen Föderation.
    </p>
  </div>
);

const OtherPreview = () => (
  <div className={cardClass}>
    <p className="text-lg font-semibold text-[var(--text)]">Andere Regionen</p>
    <div
      className="rounded-2xl border border-[var(--border)] px-4 py-4 text-sm text-[var(--muted)]"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(255,255,255,0.9))"
      }}
    >
      Matches außerhalb von Europa und Russland.
    </div>
  </div>
);
