export type GeoRegion = "chechnya" | "russia" | "europe" | "other";

const GROZNY_LAT = 43.3189;
const GROZNY_LNG = 45.6981;
const CHECHNYA_RADIUS_KM = 130;

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";
const normalizeCode = (code?: string | null) => code?.trim().toUpperCase() ?? null;

const matchesChechnyaName = (countryName?: string | null) => {
  const normalized = normalize(countryName);
  if (!normalized) {
    return false;
  }
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

export const resolveGeoRegion = ({
  countryName,
  countryCode,
  regionCode,
  latitude,
  longitude
}: RegionInput): GeoRegion => {
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
  if (normalizedCode === "RU" || normalizedRegionCode === "RU" || normalizedName.includes("russia")) {
    return "russia";
  }
  if ((normalizedCode && europeCountryCodes.has(normalizedCode)) || europeCountryNames.has(normalizedName)) {
    return "europe";
  }
  return "other";
};
