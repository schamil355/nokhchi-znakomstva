import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/env";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

const REGION_FILTERS = new Set(["chechnya", "russia", "europe", "other"]);

type DiscoveryRow = {
  id: string;
  display_name?: string | null;
  bio?: string | null;
  birthdate?: string | null;
  birthday?: string | null;
  country?: string | null;
  region_code?: string | null;
  verified_at?: string | null;
  photos?: unknown;
};

const toAge = (value?: string | null): number | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const month = today.getMonth() - date.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
};

const toPhotoUrls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      urls.push(entry);
      continue;
    }
    if (entry && typeof entry === "object") {
      const candidate = entry as Record<string, unknown>;
      const url =
        (typeof candidate.url === "string" && candidate.url) ||
        (typeof candidate.signedUrl === "string" && candidate.signedUrl) ||
        (typeof candidate.signed_url === "string" && candidate.signed_url);
      if (url) {
        urls.push(url);
      }
    }
  }
  return urls;
};

export async function GET(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ items: [] });

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 24);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 24;
  const regionParam = searchParams.get("region");
  const normalizedRegion = regionParam ? regionParam.toLowerCase() : null;
  const region = normalizedRegion && REGION_FILTERS.has(normalizedRegion) ? normalizedRegion : null;

  const supabase = getServerClient();
  const { data, error } = await supabase.rpc("get_discovery_profiles", {
    p_limit: limit,
    p_offset: 0,
    p_region: region
  });

  if (error) {
    console.error("Failed to load discovery feed", error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const items =
    (data as DiscoveryRow[] | null)?.map((row) => ({
      user_id: row.id,
      full_name: row.display_name ?? null,
      bio: row.bio ?? null,
      country: row.country ?? null,
      region_code: row.region_code ?? null,
      verified_at: row.verified_at ?? null,
      photos: toPhotoUrls(row.photos),
      age: toAge(row.birthdate ?? row.birthday),
      distance_km: null
    })) ?? [];

  return NextResponse.json({ items });
}
