"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveGeoRegion } from "@/lib/geoRegion";
import { setStoredRegion } from "@/lib/regionPreference";

type LocationStatus =
  | "idle"
  | "loading"
  | "denied"
  | "blocked"
  | "unavailable"
  | "saving"
  | "saved"
  | "error";

type CountryInfo = {
  name: string | null;
  code: string | null;
};

const fetchIpCountry = async (): Promise<CountryInfo> => {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) {
      return { name: null, code: null };
    }
    const data = await response.json();
    return {
      name: data?.country_name ?? null,
      code: data?.country_code ? String(data.country_code).toUpperCase() : null
    };
  } catch {
    return { name: null, code: null };
  }
};

const fetchGeoCountryFromCoords = async (
  latitude: number,
  longitude: number
): Promise<CountryInfo> => {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (!response.ok) {
      return { name: null, code: null };
    }
    const data = await response.json();
    return {
      name: data?.countryName ?? null,
      code: data?.countryCode ? String(data.countryCode).toUpperCase() : null
    };
  } catch {
    return { name: null, code: null };
  }
};

const getWebPosition = (): Promise<{ latitude: number; longitude: number }> =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject({ code: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    );
  });

const getGeoErrorCode = (error: unknown): number | string | null => {
  if (!error || typeof error !== "object") {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "number" || typeof code === "string") {
    return code;
  }
  return null;
};

const mapWebErrorStatus = (error: unknown): LocationStatus => {
  const code = getGeoErrorCode(error);
  if (code === 1) {
    return "denied";
  }
  if (code === 2 || code === 3) {
    return "unavailable";
  }
  if (code === "unavailable") {
    return "unavailable";
  }
  return "blocked";
};

export default function OnboardingLocationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkExisting = async () => {
      try {
        const response = await fetch("/api/settings/location");
        if (!response.ok) return;
        const data = (await response.json()) as {
          latitude: number | null;
          longitude: number | null;
        };
        if (!cancelled && data.latitude && data.longitude) {
          router.replace("/discover");
        }
      } catch {
        // ignore
      }
    };

    checkExisting();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleActivate = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const position = await getWebPosition();
      const { latitude, longitude } = position;
      const [ipCountry, gpsCountry] = await Promise.all([
        fetchIpCountry(),
        fetchGeoCountryFromCoords(latitude, longitude)
      ]);

      const normalizedGpsCountry = gpsCountry.name?.toLowerCase() ?? null;
      const normalizedIpCountry = ipCountry.name?.toLowerCase() ?? null;
      const normalizedGpsIso = gpsCountry.code ?? null;
      const normalizedIpIso = ipCountry.code ?? null;
      const hasIsoMismatch =
        Boolean(normalizedGpsIso && normalizedIpIso && normalizedGpsIso !== normalizedIpIso);
      const hasFallbackMismatch =
        Boolean(
          (!normalizedGpsIso || !normalizedIpIso) &&
            normalizedGpsCountry &&
            normalizedIpCountry &&
            normalizedGpsCountry !== normalizedIpCountry
        );
      if (hasIsoMismatch || hasFallbackMismatch) {
        setStatus("blocked");
        setMessage("VPN erkannt. Bitte deaktiviere dein VPN, um fortzufahren.");
        return;
      }

      const countryCode = gpsCountry.code ?? ipCountry.code ?? null;
      const countryName = gpsCountry.name ?? ipCountry.name ?? null;
      const region = resolveGeoRegion({
        countryName,
        countryCode,
        latitude,
        longitude
      });

      setStatus("saving");
      const response = await fetch("/api/settings/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, country: countryCode })
      });
      if (!response.ok) {
        throw new Error("save-failed");
      }

      setStoredRegion(region);
      setStatus("saved");
      router.replace("/discover");
    } catch (error) {
      if (error instanceof Error && error.message === "save-failed") {
        setStatus("error");
        setMessage("Standort konnte nicht gespeichert werden. Bitte versuche es erneut.");
        return;
      }
      const mapped = mapWebErrorStatus(error);
      setStatus(mapped);
      if (mapped === "denied") {
        setMessage("Standort wurde abgelehnt. Bitte erlaube ihn in deinem Browser.");
      } else if (mapped === "blocked") {
        setMessage("Standort ist blockiert. Bitte erlaube ihn in deinem Browser.");
      } else if (mapped === "unavailable") {
        setMessage("Standort ist auf diesem Gerät nicht verfügbar.");
      } else {
        setMessage("Standort konnte nicht ermittelt werden. Bitte versuche es erneut.");
      }
    }
  };

  return (
    <section className="px-4 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Onboarding</p>
          <h1 className="text-3xl font-semibold text-[var(--text)]">
            Standort aktivieren
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Wir brauchen deinen Standort, um dich einer Region zuzuordnen und passende
            Matches zu finden.
          </p>
        </header>

        {message ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {message}
          </div>
        ) : null}

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-6">
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Dein Standort wird nur verwendet, um deine Suchregion festzulegen.
            </p>
            <button
              type="button"
              className="pill-button pill-button--primary w-full"
              onClick={handleActivate}
              disabled={status === "loading" || status === "saving"}
            >
              {status === "loading" || status === "saving"
                ? "Standort wird geprüft …"
                : "Standort aktivieren"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
