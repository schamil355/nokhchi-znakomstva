import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/env";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

export async function POST(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ ok: true, demo: true });

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const likeeId = isRecord(payload) ? payload.likee_id : null;
  if (!likeeId || typeof likeeId !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = getServerClient();
  const { error } = await supabase.from("likes").insert({
    liker_id: user.id,
    likee_id: likeeId
  });

  if (error) {
    console.error("Failed to create like", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select("id,user_a,user_b")
    .or(`and(user_a.eq.${user.id},user_b.eq.${likeeId}),and(user_a.eq.${likeeId},user_b.eq.${user.id})`)
    .maybeSingle();
  if (matchError) {
    console.warn("Failed to check match after like", matchError);
    return NextResponse.json({ ok: true });
  }

  if (!matchRow) {
    return NextResponse.json({ ok: true });
  }

  const otherUserId = matchRow.user_a === user.id ? matchRow.user_b : matchRow.user_a;
  const { data: otherProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,photos")
    .eq("id", otherUserId)
    .maybeSingle();
  if (profileError) {
    console.warn("Failed to load match profile", profileError);
  }

  const avatarUrl = toPhotoUrls(otherProfile?.photos)[0] ?? null;

  return NextResponse.json({
    ok: true,
    match: {
      id: matchRow.id,
      other_user_id: otherUserId,
      name: otherProfile?.display_name ?? null,
      avatar_url: avatarUrl
    }
  });
}
