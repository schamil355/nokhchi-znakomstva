import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/env";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ items: [] });

  const { searchParams } = new URL(req.url);
  const match_id = searchParams.get("match_id");

  if (!match_id) return NextResponse.json({ items: [] }, { status: 400 });

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", match_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load messages", error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  return NextResponse.json({ items: data ?? [] });
}

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
  const match_id = (payload as Record<string, unknown>)?.match_id;
  const contentRaw = (payload as Record<string, unknown>)?.content;
  const content = typeof contentRaw === "string" ? contentRaw.trim() : "";
  if (!match_id || typeof match_id !== "string" || !content) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = getServerClient();
  const { error } = await supabase.from("messages").insert({
    match_id,
    sender_id: user.id,
    content
  });

  if (error) {
    console.error("Failed to send message", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
