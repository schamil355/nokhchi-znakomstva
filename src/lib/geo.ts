import { GeoRegion } from "../state/preferencesStore";
import { getLocales } from "expo-localization";

const GROZNY_LAT = 43.3189;
const GROZNY_LNG = 45.6981;
const CHECHNYA_RADIUS_KM = 130;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const matchesChechnyaName = (countryName?: string | null) => {
  const normalized = normalize(countryName);
  if (!normalized) {
    return false;
  }
  // Include common spellings/translations (EN/DE/FR/RU/alt)
  const variants = [
    "chechnya",
    "chechen",
    "chechnia",
    "tschetschenien",
    "tschetschenia",
    "tsjetschenien",
    "tsjetschenia",
    "чечня"
  ];
  return variants.some((key) => normalized.includes(key));
};

const europeCountryNames = new Set(
  [
    "albania",
    "andorra",
    "armenia",
    "austria",
    "azerbaijan",
    "belarus",
    "belgium",
    "bosnia and herzegovina",
    "bulgaria",
    "croatia",
    "cyprus",
    "czech republic",
    "denmark",
    "estonia",
    "finland",
    "france",
    "georgia",
    "germany",
    "greece",
    "hungary",
    "iceland",
    "ireland",
    "italy",
    "kazakhstan",
    "kosovo",
    "latvia",
    "liechtenstein",
    "lithuania",
    "luxembourg",
    "malta",
    "moldova",
    "monaco",
    "montenegro",
    "netherlands",
    "north macedonia",
    "norway",
    "poland",
    "portugal",
    "romania",
    "san marino",
    "serbia",
    "slovakia",
    "slovenia",
    "spain",
    "sweden",
    "switzerland",
    "turkey",
    "ukraine",
    "united kingdom",
    "vatican city"
  ].map((name) => name.toLowerCase())
);

const europeCountryCodes = new Set([
  "AL",
  "AD",
  "AM",
  "AT",
  "AZ",
  "BY",
  "BE",
  "BA",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "GE",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "KZ",
  "XK",
  "LV",
  "LI",
  "LT",
  "LU",
  "MT",
  "MD",
  "MC",
  "ME",
  "NL",
  "MK",
  "NO",
  "PL",
  "PT",
  "RO",
  "SM",
  "RS",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "TR",
  "UA",
  "GB",
  "VA"
]);

export const isWithinChechnyaRadius = (latitude?: number | null, longitude?: number | null) => {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }
  const distance = haversineDistance(latitude, longitude, GROZNY_LAT, GROZNY_LNG);
  return distance <= CHECHNYA_RADIUS_KM;
};

type RegionInput = {
  countryName?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const normalizeCode = (code?: string | null) => code?.trim().toUpperCase() ?? null;

export const resolveGeoRegion = ({ countryName, countryCode, regionCode, latitude, longitude }: RegionInput): GeoRegion => {
  if (isWithinChechnyaRadius(latitude, longitude)) {
    return "chechnya";
  }

  const normalizedRegionCode = normalizeCode(regionCode);
  if (normalizedRegionCode === "CHECHNYA") {
    return "chechnya";
  }

  const normalizedCode = normalizeCode(countryCode);
  const normalizedName = normalize(countryName);
  if (matchesChechnyaName(normalizedName)) {
    return "chechnya";
  }
  // Treat Russia as "russia" unless coordinates/region code put the profile inside Chechnya.
  if (normalizedCode === "RU" || normalizedRegionCode === "RU" || normalizedName.includes("russia")) {
    return "russia";
  }
  if ((normalizedCode && europeCountryCodes.has(normalizedCode)) || europeCountryNames.has(normalizedName)) {
    return "europe";
  }
  return "other";
};

let cachedFormatter: { tag: string; formatter: Intl.DisplayNames | null } | null = null;
const getRegionFormatter = () => {
  const locales = getLocales();
  const tag = locales?.[0]?.languageTag ?? "en-US";
  if (cachedFormatter?.tag === tag) {
    return cachedFormatter.formatter;
  }
  try {
    const formatter = new Intl.DisplayNames([tag], { type: "region" });
    cachedFormatter = { tag, formatter };
    return formatter;
  } catch {
    cachedFormatter = { tag, formatter: null };
    return null;
  }
};

export const formatCountryLabel = (countryCode?: string | null, fallback?: string | null): string | null => {
  const normalized = normalizeCode(countryCode);
  if (!normalized) {
    return fallback ?? null;
  }
  const formatter = getRegionFormatter();
  if (!formatter) {
    return fallback ?? normalized;
  }
  try {
    return formatter.of(normalized) ?? fallback ?? normalized;
  } catch {
    return fallback ?? normalized;
  }
};
