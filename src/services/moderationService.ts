import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { ReportReason } from "../types";

const reportLimiter = createRateLimiter({ intervalMs: 10_000, maxCalls: 2 });

export const reportUser = async (
  reporterId: string,
  reportedUserId: string,
  reason: ReportReason,
  details?: string
) =>
  reportLimiter(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      details
    });

    if (error) {
      throw error;
    }
  });

export const blockUser = async (userId: string, blockedUserId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("blocks")
    .insert({
      blocker_id: userId,
      blocked_id: blockedUserId
    });
  if (error && error.code !== "23505") {
    throw error;
  }
};

export const unblockUser = async (userId: string, blockedUserId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", blockedUserId);
  if (error) {
    throw error;
  }
};
