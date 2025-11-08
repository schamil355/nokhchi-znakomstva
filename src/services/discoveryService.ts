import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { calculateCompatibilityScore, isProfileEligible, shouldCreateMatch } from "../lib/matchEngine";
import { Match } from "../types";
import { mapProfile } from "./profileService";
import { DiscoveryFilters } from "../state/preferencesStore";
import { track } from "../lib/analytics";

const likeLimiter = createRateLimiter({ intervalMs: 3_000, maxCalls: 5 });
const fetchLimiter = createRateLimiter({ intervalMs: 10_000, maxCalls: 6 });
const DISCOVERY_LIMIT = 50;

export const fetchDiscoveryFeed = async (userId: string, filters: DiscoveryFilters) =>
  fetchLimiter(async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("get_discovery_profiles", {
      p_limit: DISCOVERY_LIMIT,
      p_offset: 0
    });

    if (error) {
      throw error;
    }

    const profiles = (data ?? []).map(mapProfile);

    return profiles
      .filter((profile) => profile.userId !== userId)
      .filter((profile) => filters.intentions.includes(profile.intention))
      .filter((profile) => isProfileEligible(profile, { genders: filters.genders, ageRange: filters.ageRange }));
  });

export const sendLike = async (
  likerId: string,
  likedId: string
): Promise<{ match?: Match; compatibilityScore?: number }> =>
  likeLimiter(async () => {
    const supabase = getSupabaseClient();

    const { data: like, error } = await supabase
      .from("likes")
      .insert({
        liker_id: likerId,
        likee_id: likedId
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {};
      }
      throw error;
    }

    const { data: reciprocalLike } = await supabase
      .from("likes")
      .select("*")
      .eq("liker_id", likedId)
      .eq("likee_id", likerId)
      .maybeSingle();

    if (!reciprocalLike || !shouldCreateMatch(mapLike(like), mapLike(reciprocalLike))) {
      await track("like", { targetId: likedId }).catch(() => undefined);
      return {};
    }

    const { data: matchId, error: upsertError } = await supabase.rpc("upsert_match", {
      a: likerId,
      b: likedId
    });

    if (upsertError) {
      throw upsertError;
    }

    await track("like", { targetId: likedId }).catch(() => undefined);

    let createdMatch: Match | undefined;
    if (matchId) {
      const { data: matchRow, error: fetchMatchError } = await supabase
        .from("matches_v")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();

      if (fetchMatchError) {
        throw fetchMatchError;
      }
      if (matchRow) {
        createdMatch = mapMatch(matchRow);
      }
    }
    if (matchId) {
      await track("match", { matchId }).catch(() => undefined);
    }

    const [profileA, profileB] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", likerId).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", likedId).maybeSingle()
    ]);

    let compatibilityScore: number | undefined;
    if (profileA.data && profileB.data) {
      compatibilityScore = calculateCompatibilityScore(mapProfile(profileA.data), mapProfile(profileB.data));
    }

    return { match: createdMatch, compatibilityScore };
  });

export const skipProfile = async (userId: string, skippedUserId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("passes")
    .insert({
      passer_id: userId,
      passee_id: skippedUserId
    });
  if (error && error.code !== "23505") {
    throw error;
  }
};

const mapMatch = (row: any): Match => ({
  id: row.id,
  participants: row.participants ?? [],
  createdAt: row.created_at,
  lastMessageAt: row.last_message_at ?? undefined,
  isActive: Boolean(row.is_active)
});

const mapLike = (row: any) => ({
  id: row.id,
  likerId: row.liker_id,
  likedId: row.likee_id,
  createdAt: row.created_at
});
