import { getSupabaseClient } from "../lib/supabaseClient";

export async function verifySelfieAgainstProfile(args: { profilePath: string; selfiePath: string }) {
  const supabase = getSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session) throw new Error("NOT_AUTHENTICATED");

  const { data, error } = await supabase.functions.invoke("face-verify", { body: args });
  if (error) throw error;
  return data as { isIdentical: boolean; confidence: number };
}
