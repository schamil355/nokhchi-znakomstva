import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/env";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ ok: true, demo: true });

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const likeeId = payload?.likee_id;
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

  return NextResponse.json({ ok: true });
}
