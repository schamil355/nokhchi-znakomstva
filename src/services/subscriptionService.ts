import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { useAuthStore } from "../state/authStore";

const refreshLimiter = createRateLimiter({ intervalMs: 10_000, maxCalls: 3 });

export const refreshSubscriptionStatus = async () =>
  refreshLimiter(async () => {
    const session = useAuthStore.getState().session;
    if (!session) {
      return null;
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, entitlement, expires_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data ?? null;
  });

export const setPremiumLocally = (value: boolean) => {
  const { profile, setProfile } = useAuthStore.getState();
  if (!profile) {
    return;
  }
  setProfile({
    ...profile,
    isPremium: value
  });
};
