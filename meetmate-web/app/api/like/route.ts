import { NextResponse } from "next/server";
import { env, SUPABASE_ENABLED } from "@/lib/env";

export async function POST(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ ok: true, demo: true });

  const { liker_id, likee_id } = await req.json();
  if (!liker_id || !likee_id) return NextResponse.json({ ok: false }, { status: 400 });

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ liker_id, likee_id }),
  });

  return NextResponse.json({ ok: res.ok });
}
