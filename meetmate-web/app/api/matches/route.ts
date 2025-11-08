import { NextResponse } from "next/server";
import { env, SUPABASE_ENABLED } from "@/lib/env";

const SELECT_QUERY =
  "id,user_a,user_b,created_at,last_message_at,user_a_profile:profiles!matches_user_a_fkey(id,display_name,verified_at),user_b_profile:profiles!matches_user_b_fkey(id,display_name,verified_at)";

export async function GET(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  if (!uid) return NextResponse.json({ items: [] }, { status: 400 });

  const url = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/matches`);
  url.searchParams.set("select", SELECT_QUERY);
  url.searchParams.append("order", "last_message_at.desc.nullslast");
  url.searchParams.append("order", "created_at.desc");
  url.searchParams.set("or", `(user_a.eq.${uid},user_b.eq.${uid})`);

  const res = await fetch(url.toString(), {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      Prefer: "count=none"
    }
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ items: [] }, { status: res.status });
    }
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const items = await res.json();
  return NextResponse.json({ items });
}
