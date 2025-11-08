import { cookies } from "next/headers";
import { getSupabaseServerClient } from "./supabase-server";

export const assertAdmin = async () => {
  const supabase = getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { userId: session.user.id, role: data.role } as const;
};
