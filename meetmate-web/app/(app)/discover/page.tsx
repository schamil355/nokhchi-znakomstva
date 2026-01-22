"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type MatchNotice = {
  id: string;
  name?: string | null;
  avatar_url?: string | null;
};

const DEFAULT_REGION: GeoRegion = "chechnya";
const FEED_REFRESH_MS = 30_000;

const REGION_LABELS: Record<GeoRegion, string> = {
  chechnya: "Tschetschenien",
  russia: "Russland",
  europe: "Europa",
  other: "Andere Regionen"
};

const PHOTO_POOL = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80",
];

const MATCH_AVATAR_FALLBACK = PHOTO_POOL[0];

const DEMO_MALE_CREDENTIALS = {
  userId: "mock-eu-m-01",
  email: "lukas.eu@example.com",
  password: "Demo1234!",
};

const MOCK_FEED: Candidate[] = [
  {
    user_id: "mock-eu-f-01",
    full_name: "Amina",
    age: 27,
    country: "DE",
    region_code: "EUROPE",
    verified_at: new Date().toISOString(),
    bio: "UX Designerin, liebt Third-Wave-Kaffee und Spaziergaenge am Fluss.",
    photos: [PHOTO_POOL[0]],
  },
  {
    user_id: "mock-eu-f-02",
    full_name: "Fatima",
    age: 29,
    country: "FR",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Foodie, testet neue Bistros und sammelt Rezepte aus Paris.",
    photos: [PHOTO_POOL[1]],
  },
  {
    user_id: "mock-eu-f-03",
    full_name: "Elena",
    age: 26,
    country: "ES",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Liebt Strandlaeufe, Tapas und kleine Fototouren.",
    photos: [PHOTO_POOL[2]],
  },
  {
    user_id: "mock-eu-f-04",
    full_name: "Sofia",
    age: 28,
    country: "IT",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Kocht gern italienisch, plant Citytrips und geht gern ins Museum.",
    photos: [PHOTO_POOL[3]],
  },
  {
    user_id: "mock-eu-f-05",
    full_name: "Mila",
    age: 25,
    country: "NL",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Radelt durch die Stadt, mag Designmaerkte und Eiskaffee.",
    photos: [PHOTO_POOL[4]],
  },
  {
    user_id: "mock-eu-f-06",
    full_name: "Klara",
    age: 30,
    country: "AT",
    region_code: "EUROPE",
    verified_at: new Date().toISOString(),
    bio: "Laeuft morgens im Park, hoert Podcasts und arbeitet im Marketing.",
    photos: [PHOTO_POOL[0]],
  },
  {
    user_id: "mock-eu-f-07",
    full_name: "Nora",
    age: 24,
    country: "SE",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Nordlicht, gern im Sauna-Club und bei langen Fahrradtouren.",
    photos: [PHOTO_POOL[1]],
  },
  {
    user_id: "mock-eu-f-08",
    full_name: "Lea",
    age: 29,
    country: "CH",
    region_code: "EUROPE",
    verified_at: new Date().toISOString(),
    bio: "Verbringt Wochenenden in den Bergen und liebt Buchlaeden.",
    photos: [PHOTO_POOL[2]],
  },
  {
    user_id: "mock-eu-f-09",
    full_name: "Jana",
    age: 27,
    country: "CZ",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Data Analystin, mag Yoga, Jazz und gemuetliche Cafes.",
    photos: [PHOTO_POOL[3]],
  },
  {
    user_id: "mock-eu-f-10",
    full_name: "Maja",
    age: 31,
    country: "PL",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Product Ownerin, liebt Roadtrips und Street-Food.",
    photos: [PHOTO_POOL[4]],
  },
  {
    user_id: "mock-eu-f-11",
    full_name: "Sara",
    age: 26,
    country: "PT",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Reist gern ans Meer, sammelt Vinyl und singt im Chor.",
    photos: [PHOTO_POOL[0]],
  },
  {
    user_id: "mock-eu-f-12",
    full_name: "Lara",
    age: 28,
    country: "BE",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Sammelt Vintage, mag Kunstausstellungen und Espresso.",
    photos: [PHOTO_POOL[1]],
  },
  {
    user_id: "mock-eu-f-13",
    full_name: "Tessa",
    age: 27,
    country: "DK",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Mag Hygge-Abende, Brettspiele und Hafenluft.",
    photos: [PHOTO_POOL[2]],
  },
  {
    user_id: "mock-eu-f-14",
    full_name: "Alina",
    age: 30,
    country: "RO",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Organisiert Kunst-Workshops, liebt Wochenmarkt und Weinbars.",
    photos: [PHOTO_POOL[3]],
  },
  {
    user_id: "mock-eu-f-15",
    full_name: "Petra",
    age: 29,
    country: "HU",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Architektur-Fan, mag Flohmaerkte und Nachtspaziergaenge.",
    photos: [PHOTO_POOL[4]],
  },
  {
    user_id: "mock-eu-f-16",
    full_name: "Iris",
    age: 25,
    country: "GR",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Inselmaedchen, liebt Meeresrauschen und Laufstrecken am Wasser.",
    photos: [PHOTO_POOL[0]],
  },
  {
    user_id: "mock-eu-f-17",
    full_name: "Noemi",
    age: 27,
    country: "IE",
    region_code: "EUROPE",
    verified_at: new Date().toISOString(),
    bio: "Mag Wochenendtrips, laeuft Halbmarathons und fotografiert gern.",
    photos: [PHOTO_POOL[1]],
  },
  {
    user_id: "mock-eu-f-18",
    full_name: "Daria",
    age: 28,
    country: "SK",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Spielt Volleyball, liebt Waldspaziergaenge und Backen.",
    photos: [PHOTO_POOL[2]],
  },
  {
    user_id: "mock-eu-f-19",
    full_name: "Mira",
    age: 26,
    country: "HR",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Liebt Kuestenstaedte, zeichnet gern und trinkt Matcha.",
    photos: [PHOTO_POOL[3]],
  },
  {
    user_id: "mock-eu-f-20",
    full_name: "Elif",
    age: 28,
    country: "GB",
    region_code: "EUROPE",
    verified_at: null,
    bio: "Mag Theater, laeuft am Kanal und liebt frische Pasta.",
    photos: [PHOTO_POOL[4]],
  },
  {
    user_id: DEMO_MALE_CREDENTIALS.userId,
    full_name: "Lukas",
    age: 31,
    country: "NO",
    region_code: "EUROPE",
    verified_at: new Date().toISOString(),
    bio: "Outdoor-Fan, klettert gern und kocht gern fuer Freunde.",
    photos: [PHOTO_POOL[2]],
  },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>(() => (SUPABASE_ENABLED ? [] : MOCK_FEED));
  const [loading, setLoading] = useState(SUPABASE_ENABLED);
  const [message, setMessage] = useState<string | null>(null);
  const [matchNotice, setMatchNotice] = useState<MatchNotice | null>(null);
  const [region, setRegion] = useState<GeoRegion>(DEFAULT_REGION);
  const candidatesRef = useRef<Candidate[]>([]);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);

  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    let cancelled = false;
    let inFlight = false;
    hasLoadedRef.current = false;
    const fetchFeed = async (showLoading: boolean) => {
      if (inFlight) return;
      inFlight = true;
      if (showLoading) {
        setLoading(true);
        setMessage(null);
      }
      try {
        const res = await fetch(`/api/feed?region=${region}`);
        if (!res.ok) throw new Error(`Feed request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setCandidates(data.items ?? []);
          hasLoadedRef.current = true;
          setMessage(null);
        }
      } catch (error) {
        console.warn("Failed to load feed", error);
        if (!cancelled) {
          if (!candidatesRef.current.length) {
            setMessage("Feed konnte nicht geladen werden. Demo-Modus aktiv.");
            setCandidates(MOCK_FEED);
          }
        }
      } finally {
        inFlight = false;
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    fetchFeed(true);
    const intervalId = setInterval(() => {
      void fetchFeed(!hasLoadedRef.current);
    }, FEED_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
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
        setMessage(null);
        const data = (await res.json()) as { match?: MatchNotice };
        if (data?.match?.id) {
          setMatchNotice(data.match);
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
        setMessage(null);
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

        {matchNotice ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)]">
                  <Image
                    src={matchNotice.avatar_url ?? MATCH_AVATAR_FALLBACK}
                    alt={matchNotice.name ?? "Match"}
                    width={56}
                    height={56}
                    className="h-14 w-14 object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    Ihr habt ein Match
                  </div>
                  <div className="text-lg font-semibold text-[var(--text)]">
                    Du und {matchNotice.name ?? "eurem Match"} könnt jetzt chatten.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/chat/${matchNotice.id}`}
                  className="rounded-full bg-[var(--primary-600)] px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
                >
                  Nachricht senden
                </Link>
                <button
                  type="button"
                  onClick={() => setMatchNotice(null)}
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--primary-400)]"
                >
                  Später
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
