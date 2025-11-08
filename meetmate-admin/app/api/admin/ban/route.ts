import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { assertAdminOrThrow, logAdminAction } from "../audit";

export async function POST(request: Request) {
  const admin = await assertAdminOrThrow();
  const { userEmail, action, reason } = await request.json();

  if (!userEmail || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: matches, error: searchError } = await supabase.rpc("admin_search_users", {
    search_term: userEmail
  });

  if (searchError) {
    return NextResponse.json({ error: searchError.message }, { status: 500 });
  }

  const candidate = matches?.find((row) => row.email?.toLowerCase() === String(userEmail).toLowerCase());
  if (!candidate) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const rpcName = action === "ban" ? "admin_ban_user" : "admin_unban_user";
  const { error: rpcError } = await supabase.rpc(rpcName, {
    target_user: candidate.id,
    ban_reason: reason ?? null
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  await logAdminAction(admin.id, `user.${action}`, candidate.id, { userEmail, reason });

  return NextResponse.json({ success: true });
}
