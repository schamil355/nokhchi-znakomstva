import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { assertAdminOrThrow } from "../audit";

export async function POST(request: Request) {
  await assertAdminOrThrow();
  const { query } = await request.json();
  if (!query || String(query).trim().length < 2) {
    return NextResponse.json({ data: [] });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_search_users", {
    search_term: String(query)
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
