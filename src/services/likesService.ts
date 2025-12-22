import { getSupabaseClient } from "../lib/supabaseClient";
import { mapProfile } from "./profileService";
import { Profile } from "../types";

export const fetchLikesForUser = async (userId: string, limit = 50): Promise<Profile[]> => {
  const supabase = getSupabaseClient();

  const { data: likeRows, error: likesError } = await supabase
    .from("likes")
    .select("liker_id, created_at")
    .eq("likee_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (likesError) {
    throw likesError;
  }

  const likerIds = Array.from(new Set((likeRows ?? []).map((row) => row.liker_id).filter(Boolean)));
  if (!likerIds.length) {
    return [];
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", likerIds);

  if (profilesError) {
    throw profilesError;
  }

  const profileMap = new Map<string, Profile>();
  (profilesData ?? []).forEach((row: any) => {
    const mapped = mapProfile(row);
    profileMap.set(mapped.userId, mapped);
  });

  return (likeRows ?? [])
    .map((row) => profileMap.get(row.liker_id))
    .filter((profile): profile is Profile => Boolean(profile));
};
