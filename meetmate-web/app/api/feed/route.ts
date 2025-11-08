import { NextResponse } from "next/server";
import { env, SUPABASE_ENABLED } from "@/lib/env";

export async function GET(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const uid = searchParams.get("uid");
  const limit = Number(searchParams.get("limit") ?? 24);

  if (!uid) return NextResponse.json({ items: [] }, { status: 400 });

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_feed_candidates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "count=none",
    },
    body: JSON.stringify({ uid, lim: limit }),
  });

  if (!res.ok) return NextResponse.json({ items: [] }, { status: 200 });

  const items = await res.json();
  return NextResponse.json({ items });
}
