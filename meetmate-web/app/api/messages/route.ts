import { NextResponse } from "next/server";
import { env, SUPABASE_ENABLED } from "@/lib/env";

export async function GET(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) return NextResponse.json({ items: [] }, { status: 400 });

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/messages?match_id=eq.${match_id}&select=*&order=created_at.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  });

  const items = res.ok ? await res.json() : [];
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ ok: true, demo: true });

  const { match_id, sender_id, content } = await req.json();
  if (!match_id || !sender_id || !content) return NextResponse.json({ ok: false }, { status: 400 });

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ match_id, sender_id, content }),
  });

  return NextResponse.json({ ok: res.ok });
}
