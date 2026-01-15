import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { calculateCompatibilityScore, isProfileEligible } from "../lib/matchEngine";
import { Match } from "../types";
import { mapProfile } from "./profileService";
import { DiscoveryFilters } from "../state/preferencesStore";
import { track } from "../lib/analytics";

const likeLimiter = createRateLimiter({ intervalMs: 3_000, maxCalls: 5 });
const fetchLimiter = createRateLimiter({ intervalMs: 10_000, maxCalls: 6 });
const DISCOVERY_PAGE_SIZE = 50;
const MAX_DISCOVERY_PAGES = 200; // safety guard to prevent unbounded loops (200 * 50 = 10k)
const RECENT_LIMIT = 100;

type OriginPoint = {
  latitude?: number | null;
  longitude?: number | null;
} | null;

const fetchPaginated = async <T>(
  pageSize: number,
  maxPages: number,
  fetchPage: (offset: number, limit: number) => Promise<T[]>
): Promise<T[]> => {
  const rows: T[] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const batch = await fetchPage(offset, pageSize);
    rows.push(...batch);
    if (batch.length < pageSize) {
      break;
    }
    offset += batch.length;
  }

  return rows;
};

export const fetchDiscoveryFeed = async (userId: string, filters: DiscoveryFilters, origin: OriginPoint) =>
  fetchLimiter(async () => {
    const supabase = getSupabaseClient();
    const genders = filters.genders?.length ? filters.genders : null;
    const intentions = filters.intentions?.length ? filters.intentions : null;
    const applyDistance = filters.region === "chechnya";
    const effectiveOrigin = applyDistance ? origin : null;
    const allRows = await fetchPaginated(
      DISCOVERY_PAGE_SIZE,
      MAX_DISCOVERY_PAGES,
      async (offset, limit) => {
        const { data, error } = await supabase.rpc("get_discovery_profiles", {
          p_limit: limit,
          p_offset: offset,
          p_genders: genders,
          p_intentions: intentions,
          p_min_age: filters.ageRange[0],
          p_max_age: filters.ageRange[1],
          p_min_distance_km: filters.minDistanceKm,
          p_max_distance_km: filters.distanceKm,
          p_origin_lat: effectiveOrigin?.latitude ?? null,
          p_origin_lng: effectiveOrigin?.longitude ?? null,
          p_region: filters.region
        });

        if (error) {
          throw error;
        }

        return data ?? [];
      }
    );

    const profiles = allRows.map(mapProfile);

    return profiles
      .filter((profile) => profile.userId !== userId)
      .filter((profile) =>
        isProfileEligible(profile, {
          genders: genders ?? ["female", "male", "nonbinary"],
          ageRange: filters.ageRange, // already enforced server-side, keep for safety
          region: filters.region,
          distanceRange: [filters.minDistanceKm, filters.distanceKm],
          origin: effectiveOrigin ?? undefined
        })
      );
  });
export const fetchRecentProfiles = async (userId: string, filters: DiscoveryFilters, origin: OriginPoint) =>
  fetchLimiter(async () => {
    const supabase = getSupabaseClient();
    const genders = filters.genders?.length ? filters.genders : null;
    const intentions = filters.intentions?.length ? filters.intentions : null;
    const applyDistance = filters.region === "chechnya";
    const effectiveOrigin = applyDistance ? origin : null;
    const { data, error } = await supabase.rpc("get_recent_profiles", {
      p_limit: RECENT_LIMIT,
      p_offset: 0,
      p_genders: genders,
      p_intentions: intentions,
      p_min_age: filters.ageRange[0],
      p_max_age: filters.ageRange[1],
      p_min_distance_km: filters.minDistanceKm,
      p_max_distance_km: filters.distanceKm,
      p_origin_lat: effectiveOrigin?.latitude ?? null,
      p_origin_lng: effectiveOrigin?.longitude ?? null,
      p_region: filters.region
    });

    if (error) {
      throw error;
    }

    const profiles = (data ?? []).map(mapProfile);

    return profiles
      .filter((profile) => profile.userId !== userId)
      .filter((profile) =>
        isProfileEligible(profile, {
          genders: genders ?? ["female", "male", "nonbinary"],
          ageRange: filters.ageRange, // already enforced server-side, keep for safety
          region: filters.region,
          distanceRange: [filters.minDistanceKm, filters.distanceKm],
          origin: effectiveOrigin ?? undefined
        })
      );
  });

export const sendLike = async (
  likerId: string,
  likedId: string
): Promise<{ match?: Match; compatibilityScore?: number }> =>
  likeLimiter(async () => {
    const supabase = getSupabaseClient();

    const insertLike = async () => {
      const { error } = await supabase
        .from("likes")
        .insert({
          liker_id: likerId,
          likee_id: likedId
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          await supabase.from("likes").delete().eq("liker_id", likerId).eq("likee_id", likedId);
          const { error: retryError } = await supabase
            .from("likes")
            .insert({
              liker_id: likerId,
              likee_id: likedId
            })
            .select("*")
            .single();
          if (retryError) {
            throw retryError;
          }
          return;
        }
        throw error;
      }
    };

    await insertLike();

    const { data: matchId, error: upsertError } = await supabase.rpc("upsert_match", {
      a: likerId,
      b: likedId
    });

    if (upsertError) {
      throw upsertError;
    }

    await track("like", { targetId: likedId }).catch(() => undefined);

    if (!matchId) {
      return {};
    }

    let createdMatch: Match | undefined;
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

    await track("match", { matchId }).catch(() => undefined);

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
