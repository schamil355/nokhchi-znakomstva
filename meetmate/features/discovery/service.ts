import { differenceInYears } from "date-fns";
import { z } from "zod";
import { getSupabase, storageBucket } from "../../lib/supabase";
import { fetchProfileForUser } from "../profile/service";
import { Coordinates, ProfilePhoto } from "../../types";
import { DiscoveryCandidate, DiscoveryPreferences, SwipeAction } from "./types";
import { invokeNotify } from "../../lib/notifications";

export type PublicProfileRow = {
  id: string;
  display_name: string;
  bio: string | null;
  birthdate: string;
  gender: string;
  orientation: string;
  interests: string[] | null;
  photos: Array<{ path: string }> | null;
  location: any;
  updated_at?: string;
  last_active_at?: string | null;
  feedback_score?: number | null;
};

const toCoordinates = (value: any): Coordinates | null => {
  if (!value) {
    return null;
  }
  if (typeof value === "object" && Array.isArray(value.coordinates)) {
    const [lng, lat] = value.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return { latitude: lat, longitude: lng };
    }
  }
  if (typeof value === "string" && value.startsWith("POINT")) {
    const match = value.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (match) {
      const [, lngStr, latStr] = match;
      const lat = Number(latStr);
      const lng = Number(lngStr);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }
  return null;
};

const toSignedPhotos = async (
  photos: Array<{ path: string }> | null,
): Promise<ProfilePhoto[]> => {
  if (!photos?.length) {
    return [];
  }
  const bucket = storageBucket("photos");
  const { data, error } = await bucket.createSignedUrls(
    photos.map((photo) => photo.path),
    3600,
  );
  if (error) {
    throw error;
  }
  return photos.map((photo, index) => ({
    path: photo.path,
    url: data?.[index]?.signedUrl ?? "",
  }));
};

const toCandidate = async (
  row: PublicProfileRow,
  distanceKm?: number,
): Promise<DiscoveryCandidate> => ({
  id: row.id,
  displayName: row.display_name,
  bio: row.bio ?? "",
  gender: row.gender as DiscoveryCandidate["gender"],
  orientation: row.orientation as DiscoveryCandidate["orientation"],
  birthdate: row.birthdate,
  interests: row.interests ?? [],
  photos: await toSignedPhotos(row.photos),
  distanceKm,
  lastActiveAt: row.last_active_at ?? row.updated_at,
  feedbackScore: row.feedback_score ?? 0.5,
});

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (a: Coordinates, b: Coordinates) => {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(b.latitude - a.latitude);
  const dLon = degreesToRadians(b.longitude - a.longitude);
  const lat1 = degreesToRadians(a.latitude);
  const lat2 = degreesToRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const c = sinLat * sinLat + sinLon * sinLon * Math.cos(lat1) * Math.cos(lat2);
  const d = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));

  return earthRadiusKm * d;
};

export const ensureUserLocation = async (userId: string): Promise<Coordinates | null> => {
  const profile = await fetchProfileForUser(userId);
  return profile?.location ?? null;
};

export const fetchBlockedIds = async (userId: string): Promise<string[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("blocks")
    .select("blocked")
    .eq("blocker", userId);
  if (error) {
    throw error;
  }
  return (data ?? []).map((row) => row.blocked);
};

export const fetchDiscoveryCandidates = async ({
  userId,
  location,
  preferences,
  excludeIds,
}: {
  userId: string;
  location: Coordinates;
  preferences: DiscoveryPreferences;
  excludeIds: string[];
}): Promise<DiscoveryCandidate[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("public_profiles")
    .select(
      "id, display_name, bio, birthdate, gender, orientation, interests, photos, location, updated_at, last_active_at, feedback_score",
    )
    .neq("id", userId)
    .in("gender", preferences.interestedIn)
    .limit(preferences.maxResults);

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  const candidates = await mapPublicProfilesToCandidates(
    rows.filter((row) => !excludeIds.includes(row.id)),
    location,
  );

  return candidates.filter((candidate) => {
    if (candidate.distanceKm == null) {
      return true;
    }
    return candidate.distanceKm <= preferences.radiusKm;
  });
};

export const mapPublicProfilesToCandidates = async (
  rows: PublicProfileRow[],
  viewerLocation?: Coordinates | null,
) => {
  const hydrated = await Promise.all(
    rows.map(async (row) => {
      const age = differenceInYears(new Date(), new Date(row.birthdate));
      if (age < 18) {
        return null;
      }
      const profileLocation = toCoordinates(row.location);
      const distance =
        viewerLocation && profileLocation
          ? haversineDistanceKm(viewerLocation, profileLocation)
          : undefined;
      return toCandidate(row, distance);
    }),
  );

  return hydrated.filter(Boolean) as DiscoveryCandidate[];
};

export const sendSwipeAction = async ({
  currentUserId,
  targetUserId,
  action,
}: {
  currentUserId: string;
  targetUserId: string;
  action: SwipeAction;
}): Promise<{ matchId?: string | null }> => {
  const schema = z.object({
    currentUserId: z.string().min(1),
    targetUserId: z.string().min(1),
    action: z.enum(["pass", "like", "superlike"] as const),
  });

  const parsed = schema.parse({ currentUserId, targetUserId, action });
  if (parsed.action === "pass") {
    return {};
  }

  const supabase = getSupabase();
  const { data: abuseData, error: abuseError } = await supabase.functions.invoke(
    "abuse-check",
    {
      body: {
        userId: parsed.currentUserId,
        action: "like",
      },
    },
  );
  if (abuseError) {
    throw abuseError;
  }
  if (abuseData && abuseData.allow === false) {
    throw new Error(
      abuseData.reason ?? "Zu viele Aktionen. Bitte versuche es in Kürze erneut.",
    );
  }

  const { error } = await supabase
    .from("likes")
    .insert({
      liker: parsed.currentUserId,
      liked: parsed.targetUserId,
      is_superlike: parsed.action === "superlike",
    })
    .select("id")
    .maybeSingle();

  if (error && error.code !== "23505") {
    throw error;
  }

  const sorted = [parsed.currentUserId, parsed.targetUserId].sort();
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .eq("user_a", sorted[0])
    .eq("user_b", sorted[1])
    .maybeSingle();

  if (matchError && matchError.code !== "PGRST116") {
    throw matchError;
  }

  const matchId = matchData?.id ?? null;

  if (matchId) {
    await invokeNotify({
      type: "match",
      matchId,
      receiverId: parsed.targetUserId,
      actorId: parsed.currentUserId,
    });
  }

  return { matchId };
};
