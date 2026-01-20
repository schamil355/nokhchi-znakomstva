import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/env";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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
  const passeeId = isRecord(payload) ? payload.passee_id : null;
  if (!passeeId || typeof passeeId !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = getServerClient();
  const { error } = await supabase.from("passes").insert({
    passer_id: user.id,
    passee_id: passeeId
  });

  if (error) {
    console.error("Failed to create pass", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
