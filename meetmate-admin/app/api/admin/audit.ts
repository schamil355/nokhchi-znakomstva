import { getSupabaseServerClient } from "@/lib/supabase-server";

export const assertAdminOrThrow = async () => {
  const supabase = getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const { data } = await supabase.from("admins").select("role").eq("user_id", session.user.id).maybeSingle();
  if (!data) {
    throw new Error("NOT_AUTHORIZED");
  }
  return { id: session.user.id, role: data.role } as const;
};

export const logAdminAction = async (adminId: string, action: string, target?: string, details?: Record<string, unknown>) => {
  const supabase = getSupabaseServerClient();
  await supabase.from("admin_audit").insert({
    admin_id: adminId,
    action,
    target,
    details: details ?? null
  });
};
