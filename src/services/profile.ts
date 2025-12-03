import { getSupabaseClient } from "../lib/supabaseClient";

export async function markProfileVerified(params?: { similarity?: number }) {
  const supabase = getSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error("NOT_AUTHENTICATED");

  const update: Record<string, any> = {
    verified: true,
    verified_at: new Date().toISOString()
  };
  if (typeof params?.similarity === "number") {
    update.verified_face_score = params.similarity;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", session.user.id);
  if (error) throw error;
}
