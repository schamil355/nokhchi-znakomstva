import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const EU_CODES = [
  "AL","AD","AM","AT","AZ","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","GE","DE","GR","HU","IS","IE","IT",
  "KZ","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","SM","RS","SK","SI","ES","SE","CH","TR","UA","GB","VA"
];

const toRadians = (value: number) => (value * Math.PI) / 180;
const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const GROZNY_LAT = 43.3189;
const GROZNY_LNG = 45.6981;
const CHECHNYA_RADIUS_KM = 130;

const resolveRegion = (country?: string | null, lat?: number | null, lng?: number | null) => {
  if (typeof lat === "number" && typeof lng === "number") {
    const distance = haversine(lat, lng, GROZNY_LAT, GROZNY_LNG);
    if (distance <= CHECHNYA_RADIUS_KM) return "chechnya";
  }
  if (country?.toUpperCase() === "RU") return "russia";
  if (country && EU_CODES.includes(country.toUpperCase())) return "europe";
  return "other";
};

const isChechnyaName = (value?: string | null) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized.includes("grozn") ||
    normalized.includes("грозн") ||
    normalized.includes("chechn") ||
    normalized.includes("чеч")
  );
};

// Minimal geohash encoder (5 chars precision) for grouping
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const encodeGeohash = (lat: number, lon: number, precision = 5) => {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = idx * 2 + 1;
        lonMin = lonMid;
      } else {
        idx = idx * 2;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = idx * 2 + 1;
        latMin = latMid;
      } else {
        idx = idx * 2;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;
    bit++;
    if (bit === 5) {
      geohash += BASE32.charAt(idx);
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
};

export async function GET() {
  const supabase = getSupabaseServerClient();

  const [
    { data: metrics, error: metricsError },
    { data: euProfiles, error: euError },
    { data: otherProfiles, error: otherError },
    { count: matchesCount, error: matchesError },
    { data: allLocations, error: locationsError },
    { data: reportsRaw, error: reportsError },
    { count: registrationsCompleted, error: registrationsCompletedError }
  ] = await Promise.all([
    supabase.rpc("admin_profile_metrics"),
    supabase.from("profiles").select("country").in("country", EU_CODES),
    supabase
      .from("profiles")
      .select("country")
      .not("country", "is", null)
      .not("country", "in", `(${EU_CODES.join(",")},RU)`),
    supabase.from("matches").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("country, latitude, longitude, city, district, birthday, gender"),
    supabase
      .from("events")
      .select("props, created_at, user_id")
      .eq("name", "report_profile")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("registration_completed_at", "is", null)
  ]);

  if (
    metricsError ||
    euError ||
    otherError ||
    matchesError ||
    locationsError ||
    reportsError ||
    registrationsCompletedError
  ) {
    const message =
      metricsError?.message ||
      euError?.message ||
      otherError?.message ||
      matchesError?.message ||
      locationsError?.message ||
      reportsError?.message ||
      registrationsCompletedError?.message ||
      "Failed to load metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const countryCounts = Object.entries(
    (euProfiles ?? []).reduce<Record<string, number>>((acc, row: any) => {
      const code = row.country ?? "unknown";
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  const otherCountryCounts = Object.entries(
    (otherProfiles ?? []).reduce<Record<string, number>>((acc, row: any) => {
      const code = row.country ?? "unknown";
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  const gender = {
    male: metrics?.gender?.male ?? 0,
    female: metrics?.gender?.female ?? 0,
    unknown: metrics?.gender?.unknown ?? 0
  };
  const platform = {
    ios: (metrics as any)?.platform?.ios ?? 0,
    android: (metrics as any)?.platform?.android ?? 0
  };

  const regions = {
    ingushetia: metrics?.regions?.ingushetia ?? 0,
    chechnya: metrics?.regions?.chechnya ?? 0,
    russia: metrics?.regions?.russia ?? 0,
    europe: metrics?.regions?.europe ?? 0,
    other: metrics?.regions?.other ?? 0
  };
  const topFemale = Array.isArray((metrics as any)?.top_female) ? (metrics as any).top_female : [];
  const topMale = Array.isArray((metrics as any)?.top_male) ? (metrics as any).top_male : [];

  const locations = (allLocations ?? []).map((row: any) => {
    const lat = typeof row.latitude === "number" ? row.latitude : null;
    const lng = typeof row.longitude === "number" ? row.longitude : null;
    const baseRegion = resolveRegion(row.country, lat, lng);
    const regionAdjusted =
      baseRegion === "russia" && (isChechnyaName(row.city) || isChechnyaName(row.district)) ? "chechnya" : baseRegion;
    return {
      ...row,
      region: regionAdjusted
    };
  });

  const geohashByRegion = locations.reduce<Record<string, Array<{ geohash: string; count: number }>>>(
    (acc, row: any) => {
      const lat = typeof row.latitude === "number" ? row.latitude : null;
      const lng = typeof row.longitude === "number" ? row.longitude : null;
      if (lat === null || lng === null) {
        return acc;
      }
      const region = row.region ?? resolveRegion(row.country, lat, lng);
      const geohash = encodeGeohash(lat, lng, 5);
      if (!acc[region]) acc[region] = [];
      const bucket = acc[region].find((b) => b.geohash === geohash);
      if (bucket) {
        bucket.count += 1;
      } else {
        acc[region].push({ geohash, count: 1 });
      }
      return acc;
    },
    {}
  );

  Object.keys(geohashByRegion).forEach((key) => {
    geohashByRegion[key] = geohashByRegion[key].sort((a, b) => b.count - a.count);
  });

  const cityCountsAll = Object.entries(
    locations.reduce<Record<string, number>>((acc, row: any) => {
      if (!row.city) return acc;
      acc[row.city] = (acc[row.city] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  const districtCountsAll = Object.entries(
    locations.reduce<Record<string, number>>((acc, row: any) => {
      if (!row.district) return acc;
      acc[row.district] = (acc[row.district] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);

  const cityCountsEurope = Object.entries(
    locations.reduce<Record<string, number>>((acc, row: any) => {
      const code = row.country?.toUpperCase() ?? null;
      if (!code || !EU_CODES.includes(code)) return acc;
      if (!row.city) return acc;
      acc[row.city] = (acc[row.city] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  const districtCountsEurope = Object.entries(
    locations.reduce<Record<string, number>>((acc, row: any) => {
      const code = row.country?.toUpperCase() ?? null;
      if (!code || !EU_CODES.includes(code)) return acc;
      if (!row.district) return acc;
      acc[row.district] = (acc[row.district] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);

  const cityCountsOther = Object.entries(
    locations.reduce<Record<string, number>>((acc, row: any) => {
      const code = row.country?.toUpperCase() ?? null;
      if (!code || EU_CODES.includes(code) || code === "RU") return acc;
      if (!row.city) return acc;
      acc[row.city] = (acc[row.city] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);

  const districtCountsOther = Object.entries(
    locations.reduce<Record<string, number>>((acc, row: any) => {
      const code = row.country?.toUpperCase() ?? null;
      if (!code || EU_CODES.includes(code) || code === "RU") return acc;
      if (!row.district) return acc;
      acc[row.district] = (acc[row.district] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([district, count]) => ({ district, count }))
    .sort((a, b) => b.count - a.count);

  const calcAge = (value?: string | null) => {
    if (!value) return null;
    const birthday = new Date(value);
    if (Number.isNaN(birthday.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
      age--;
    }
    return age;
  };

  const bucketLabel = (age: number | null) => {
    if (age === null || age < 0) return "unknown";
    if (age <= 24) return "18-24";
    if (age <= 34) return "25-34";
    if (age <= 44) return "35-44";
    if (age <= 54) return "45-54";
    return "55+";
  };

  const ageBuckets = Object.entries(
    locations.reduce<Record<string, number>>((acc, row: any) => {
      const age = calcAge(row.birthday ?? null);
      const bucket = bucketLabel(age);
      acc[bucket] = (acc[bucket] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => b.count - a.count);

  const buildRegionDetail = (regionKey: GeoRegion) => {
    const rows = locations.filter((row: any) => row.region === regionKey);
    const total = rows.length;
    const female = rows.filter((r: any) => r.gender === "female").length;
    const male = rows.filter((r: any) => r.gender === "male").length;
    const ageMap = rows.reduce<Record<string, number>>((acc, r: any) => {
      const age = calcAge(r.birthday ?? null);
      const bucket = bucketLabel(age);
      acc[bucket] = (acc[bucket] ?? 0) + 1;
      return acc;
    }, {});
    const cities = Object.entries(
      rows.reduce<Record<string, number>>((acc, r: any) => {
        if (!r.city) return acc;
        acc[r.city] = (acc[r.city] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);

    const districts = Object.entries(
      rows.reduce<Record<string, number>>((acc, r: any) => {
        if (!r.district) return acc;
        acc[r.district] = (acc[r.district] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count);

    const ageBucketsRegion = Object.entries(ageMap)
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => b.count - a.count);

    return { total, female, male, cities, districts, ageBuckets: ageBucketsRegion };
  };

  const russiaDetail = buildRegionDetail("russia");
  const chechnyaDetail = buildRegionDetail("chechnya");

  const euCountryDetailsMap = (allLocations ?? []).reduce<Record<
    string,
    { country: string; total: number; female: number; male: number; ageMap: Record<string, number> }
  >>((acc, row: any) => {
    const code = row.country?.toUpperCase() ?? null;
    if (!code || !EU_CODES.includes(code)) return acc;
    if (!acc[code]) {
      acc[code] = { country: code, total: 0, female: 0, male: 0, ageMap: {} };
    }
    acc[code].total += 1;
    if (row.gender === "female") acc[code].female += 1;
    if (row.gender === "male") acc[code].male += 1;
    const age = calcAge(row.birthday ?? null);
    const bucket = bucketLabel(age);
    acc[code].ageMap[bucket] = (acc[code].ageMap[bucket] ?? 0) + 1;
    return acc;
  }, {});

  const euCountryDetails = Object.values(euCountryDetailsMap)
    .map((entry) => ({
      country: entry.country,
      total: entry.total,
      female: entry.female,
      male: entry.male,
      ageBuckets: Object.entries(entry.ageMap)
        .map(([bucket, count]) => ({ bucket, count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.total - a.total);

  const deletedAccounts = 0;

  const otherCountryDetailsMap = (allLocations ?? []).reduce<Record<
    string,
    { country: string; total: number; female: number; male: number; ageMap: Record<string, number> }
  >>((acc, row: any) => {
    const code = row.country?.toUpperCase() ?? null;
    if (!code || EU_CODES.includes(code) || code === "RU") return acc;
    if (!acc[code]) {
      acc[code] = { country: code, total: 0, female: 0, male: 0, ageMap: {} };
    }
    acc[code].total += 1;
    if (row.gender === "female") acc[code].female += 1;
    if (row.gender === "male") acc[code].male += 1;
    const age = calcAge(row.birthday ?? null);
    const bucket = bucketLabel(age);
    acc[code].ageMap[bucket] = (acc[code].ageMap[bucket] ?? 0) + 1;
    return acc;
  }, {});

  const otherCountryDetails = Object.values(otherCountryDetailsMap)
    .map((entry) => ({
      country: entry.country,
      total: entry.total,
      female: entry.female,
      male: entry.male,
      ageBuckets: Object.entries(entry.ageMap)
        .map(([bucket, count]) => ({ bucket, count }))
        .sort((a, b) => b.count - a.count)
    }))
    .sort((a, b) => b.total - a.total);

  const reportedUsers = Object.values(
    (reportsRaw ?? []).reduce<Record<
      string,
      { targetId: string; count: number; lastReportedAt: string; reporters: Set<string> }
    >>((acc, row: any) => {
      const props = row.props ?? {};
      const targetId =
        props.targetId ??
        props.target_id ??
        props.targetid ??
        props.target ??
        props.userId ??
        props.user_id ??
        null;
      if (!targetId) {
        return acc;
      }
      const key = String(targetId);
      const existing = acc[key] ?? {
        targetId: key,
        count: 0,
        lastReportedAt: row.created_at,
        reporters: new Set<string>()
      };
      existing.count += 1;
      if (!existing.lastReportedAt || new Date(row.created_at) > new Date(existing.lastReportedAt)) {
        existing.lastReportedAt = row.created_at;
      }
      if (row.user_id) {
        existing.reporters.add(String(row.user_id));
      }
      acc[key] = existing;
      return acc;
    }, {})
  )
    .map((item) => ({
      targetId: item.targetId,
      count: item.count,
      lastReportedAt: item.lastReportedAt,
      reporters: Array.from(item.reporters)
    }))
    .sort((a, b) =>
      b.count === a.count
        ? new Date(b.lastReportedAt).getTime() - new Date(a.lastReportedAt).getTime()
        : b.count - a.count
    );

  return NextResponse.json(
    {
      gender,
      regions,
      incognito: metrics?.incognito ?? 0,
      platform,
      countryCounts,
      otherCountryCounts,
      matches: matchesCount ?? 0,
      geohashByRegion,
      cityCountsAll,
      districtCountsAll,
      cityCountsEurope,
      districtCountsEurope,
      cityCountsOther,
      districtCountsOther,
      ageBuckets,
      euCountryDetails,
      otherCountryDetails,
      russiaDetail,
      chechnyaDetail,
      topFemale,
      topMale,
      deletedAccounts: deletedAccounts ?? 0,
      reportedUsers,
      registrationCompleted: registrationsCompleted ?? 0
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    }
  );
}
export const dynamic = "force-dynamic";
export const revalidate = 0;
