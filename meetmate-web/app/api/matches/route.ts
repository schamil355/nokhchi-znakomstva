import { NextResponse } from "next/server";
import { SUPABASE_ENABLED } from "@/lib/env";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

const SELECT_QUERY =
  "id,user_a,user_b,created_at,last_message_at,user_a_profile:profiles!matches_user_a_fkey(id,display_name,verified_at),user_b_profile:profiles!matches_user_b_fkey(id,display_name,verified_at)";

export async function GET(req: Request) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ items: [] });

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select(SELECT_QUERY)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load matches", error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  return NextResponse.json({ items: data ?? [], viewer_id: user.id });
}
