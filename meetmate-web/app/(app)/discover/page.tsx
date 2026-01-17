"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SwipeDeck } from "@/components/SwipeDeck";
import { SUPABASE_ENABLED } from "@/lib/env";
import { resolveGeoRegion, type GeoRegion } from "@/lib/geoRegion";
import { getStoredRegion, setStoredRegion } from "@/lib/regionPreference";

type Candidate = {
  user_id: string;
  full_name?: string | null;
  country?: string | null;
  region_code?: string | null;
  verified_at?: string | null;
  photos?: string[];
  bio?: string | null;
  age?: number | null;
  distance_km?: number | null;
};

const DEFAULT_REGION: GeoRegion = "chechnya";

const REGION_LABELS: Record<GeoRegion, string> = {
  chechnya: "Tschetschenien",
  russia: "Russland",
  europe: "Europa",
  other: "Andere Regionen"
};

const MOCK_FEED: Candidate[] = [
  {
    user_id: "mock-1",
    full_name: "Amina, 27",
    country: "DE",
    region_code: "EUROPE",
    verified_at: new Date().toISOString(),
    bio: "UX Designerin, liebt Third-Wave-Kaffee und spontane Trips nach Südtirol.",
    photos: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    user_id: "mock-2",
    full_name: "Fatima, 29",
    country: "FR",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Foodie, die neue Restaurants testet – und immer Dessert bestellt.",
    photos: [
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    user_id: "mock-3",
    full_name: "Zara, 26",
    country: "RU",
    region_code: "RUSSIA",
    verified_at: null,
    bio: "Data Scientist, gerne in der Boulderhalle oder mit Espresso in der Sonne.",
    photos: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    ],
  },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>(() => (SUPABASE_ENABLED ? [] : MOCK_FEED));
  const [loading, setLoading] = useState(SUPABASE_ENABLED);
  const [message, setMessage] = useState<string | null>(null);
  const [region, setRegion] = useState<GeoRegion>(DEFAULT_REGION);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    let cancelled = false;
    const fetchFeed = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/feed?region=${region}`);
        if (!res.ok) throw new Error(`Feed request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setCandidates(data.items ?? []);
        }
      } catch (error) {
        console.warn("Failed to load feed", error);
        if (!cancelled) {
          setMessage("Feed konnte nicht geladen werden. Demo-Modus aktiv.");
          setCandidates(MOCK_FEED);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFeed();
    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    const stored = getStoredRegion();
    if (stored) {
      setRegion(stored);
    }
  }, []);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    let cancelled = false;
    const checkLocation = async () => {
      try {
        const response = await fetch("/api/settings/location");
        if (response.status === 401) {
          return;
        }
        if (!response.ok) {
          throw new Error(`Location request failed (${response.status})`);
        }
        const data = (await response.json()) as {
          latitude: number | null;
          longitude: number | null;
          country: string | null;
        };
        if (cancelled) return;
        if (!data.latitude || !data.longitude) {
          router.replace("/onboarding/location");
          return;
        }
        if (!getStoredRegion()) {
          const derived = resolveGeoRegion({
            countryCode: data.country,
            latitude: data.latitude,
            longitude: data.longitude
          });
          setStoredRegion(derived);
          setRegion(derived);
        }
      } catch (error) {
        console.warn("Location check failed", error);
      }
    };

    checkLocation();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLike = useCallback(
    async (candidate: Candidate) => {
      if (!SUPABASE_ENABLED) return;
      try {
        const res = await fetch("/api/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ likee_id: candidate.user_id }),
        });
        if (!res.ok) {
          throw new Error(`Like failed (${res.status})`);
        }
      } catch (error) {
        console.warn("Like failed", error);
        setMessage("Like fehlgeschlagen.");
      }
    },
    []
  );

  const handlePass = useCallback(
    async (candidate: Candidate) => {
      if (!SUPABASE_ENABLED) return;
      try {
        const res = await fetch("/api/pass", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passee_id: candidate.user_id }),
        });
        if (!res.ok) {
          throw new Error(`Pass failed (${res.status})`);
        }
      } catch (error) {
        console.warn("Pass failed", error);
        setMessage("Pass konnte nicht verarbeitet werden.");
      }
    },
    []
  );

  const subtitle = useMemo(() => {
    if (!SUPABASE_ENABLED) return "Demo-Feed: Supabase nicht konfiguriert.";
    if (loading) return "Lade passende Profile …";
    const regionLabel = REGION_LABELS[region];
    return `${candidates.length} Profile · Region: ${regionLabel}`;
  }, [candidates.length, loading, region]);

  return (
    <section className="px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold text-[var(--text)]">Entdecken</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span>{subtitle}</span>
            <Link
              href="/filters"
              className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:border-[var(--primary-400)]"
            >
              Filter
            </Link>
          </div>
        </header>

        {message ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--accent-100)] px-4 py-3 text-sm text-[var(--text)]">
            {message}
          </div>
        ) : null}

        <SwipeDeck items={candidates} onLike={handleLike} onPass={handlePass} />
      </div>
    </section>
  );
}
