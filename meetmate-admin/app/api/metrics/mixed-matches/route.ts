import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const readInt = (value: string | null, fallback: number, min: number, max: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return clampNumber(parsed, min, max);
};

const parseDateParam = (value: string | null, endOfDay: boolean) => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    const date = new Date(
      Date.UTC(year, month, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    );
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = readInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = readInt(searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
  const from = parseDateParam(searchParams.get("from"), false);
  const to = parseDateParam(searchParams.get("to"), true);

  const supabase = getSupabaseServerClient();

  let query = supabase
    .from("matches")
    .select("id, user_a, user_b, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) {
    query = query.gte("created_at", from);
  }
  if (to) {
    query = query.lte("created_at", to);
  }

  const { data: matches, error: matchesError } = await query;
  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const matchRows = (matches ?? []) as Array<{
    id: string;
    user_a: string | null;
    user_b: string | null;
    created_at: string;
  }>;

  const matchUserIds = Array.from(
    new Set(
      matchRows
        .flatMap((row) => [row.user_a, row.user_b])
        .filter((id): id is string => Boolean(id))
    )
  );

  let matchProfiles: Array<{ id: string; gender: string | null }> = [];
  if (matchUserIds.length > 0) {
    const { data: profileRows, error: matchProfilesError } = await supabase
      .from("profiles")
      .select("id, gender")
      .in("id", matchUserIds);
    if (matchProfilesError) {
      return NextResponse.json({ error: matchProfilesError.message }, { status: 500 });
    }
    matchProfiles = (profileRows ?? []) as Array<{ id: string; gender: string | null }>;
  }

  const genderById = new Map(
    matchProfiles.map((row) => [row.id, (row.gender ?? "").toLowerCase()])
  );

  const items = matchRows.reduce<
    Array<{ match_id: string; male_user_id: string; female_user_id: string; created_at: string }>
  >((acc, row) => {
    if (!row.user_a || !row.user_b) return acc;
    const genderA = genderById.get(row.user_a);
    const genderB = genderById.get(row.user_b);
    if (genderA === "male" && genderB === "female") {
      acc.push({
        match_id: row.id,
        male_user_id: row.user_a,
        female_user_id: row.user_b,
        created_at: row.created_at
      });
    } else if (genderA === "female" && genderB === "male") {
      acc.push({
        match_id: row.id,
        male_user_id: row.user_b,
        female_user_id: row.user_a,
        created_at: row.created_at
      });
    }
    return acc;
  }, []);

  const hasMore = matchRows.length === limit;

  return NextResponse.json(
    {
      items,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      limit
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
