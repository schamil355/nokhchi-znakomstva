import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { PROFILE_BUCKET } from "../lib/storage";
import { Profile, Intention, Gender, RelationshipCompass } from "../types";
import { useAuthStore } from "../state/authStore";

const relationshipCompassSchema = z
  .object({
    timeline: z.enum(["fast", "steady", "slow", "no_timeline"]),
    familyCloseness: z.enum(["very_close", "close", "neutral", "independent"]),
    religiousPractice: z.enum(["practicing", "occasional", "cultural", "not_religious", "private"]),
    relocation: z.enum(["stay", "open_national", "open_international", "flexible"]),
    familyIntro: z.enum(["early", "some_months", "when_sure", "private"]),
    roles: z.enum(["traditional", "mixed", "modern", "depends"]),
    lifestyle: z.enum(["homebody", "balanced", "active", "career_focus"])
  })
  .partial()
  .optional()
  .nullable();

const profileSchema = z.object({
  displayName: z.string().min(2).max(32),
  birthday: z.string(),
  bio: z.string().max(300).optional().default(""),
  gender: z.custom<Gender>(),
  intention: z.custom<Intention>(),
  interests: z.array(z.string()).max(10),
  photos: z.array(
    z.object({
      id: z.string(),
      url: z.string().url().optional(),
      createdAt: z.string(),
      assetId: z.number().optional(),
      visibilityMode: z.string().optional()
    })
  ),
  primaryPhotoPath: z.string().optional().nullable(),
  primaryPhotoId: z.number().optional().nullable(),
  relationshipCompass: relationshipCompassSchema
});

const updateLimiter = createRateLimiter({ intervalMs: 5_000, maxCalls: 3 });

export const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      user_id,
      display_name,
      birthday,
      bio,
      gender,
      intention,
      interests,
      photos,
      created_at,
      updated_at,
      is_premium,
      last_active_at,
      is_incognito,
      hide_nearby,
      hide_nearby_radius,
      show_distance,
      show_last_seen,
      verified,
      verified_at,
      verified_face_score,
      relationship_compass,
      primary_photo_path,
      region_code,
      country,
      latitude,
      longitude
    `
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116" || error.code === "PGRST301" || error?.message?.includes("Results contain 0 rows")) {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProfile(data);
};

export type ProfileInput = z.infer<typeof profileSchema>;

export const upsertProfile = async (userId: string, input: ProfileInput): Promise<Profile> =>
  updateLimiter(async () => {
    const supabase = getSupabaseClient();
    const parsed = profileSchema.parse(input);
    const payload: Record<string, unknown> = {
      id: userId,
      user_id: userId,
      display_name: parsed.displayName,
      birthday: parsed.birthday,
      bio: parsed.bio,
      gender: parsed.gender,
      intention: parsed.intention,
      interests: parsed.interests,
      photos: parsed.photos,
      primary_photo_path: parsed.primaryPhotoPath ?? null,
      primary_photo_id: parsed.primaryPhotoId ?? null,
      is_premium: parsed.photos.length >= 3 ? true : parsed.photos.some((photo) => photo.url.includes("premium")),
      updated_at: new Date().toISOString()
    };
    if (parsed.relationshipCompass !== undefined) {
      payload.relationship_compass = parsed.relationshipCompass ?? null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const mapped = mapProfile(data);
    useAuthStore.getState().setProfile(mapped);
    return mapped;
  });

export const updatePrimaryPhotoPath = async (path: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("not authenticated");
  }
  const { data, error } = await supabase
    .from("profiles")
    .update({ primary_photo_path: path })
    .eq("id", session.user.id)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  const mapped = mapProfile(data);
  useAuthStore.getState().setProfile(mapped);
};

export const refetchProfile = async () => {
  const {
    data: { session }
  } = await getSupabaseClient().auth.getSession();
  if (!session?.user?.id) return null;
  const profile = await fetchProfile(session.user.id);
  if (profile) {
    useAuthStore.getState().setProfile(profile);
  }
  return profile;
};

export const removeProfilePhoto = async (photoId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(PROFILE_BUCKET).remove([photoId]);
  if (error) {
    throw error;
  }
};

const isVerificationPhoto = (photo: any): boolean => {
  const candidates = [
    photo?.storagePath,
    photo?.storage_path,
    photo?.url,
    photo?.signedUrl
  ]
    .filter((value) => typeof value === "string")
    .map((value: string) => value.toLowerCase());

  return candidates.some((value) => value.includes("/verifications/") || value.includes("verifications/"));
};

const toNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const dedupePhotos = (photos: any[]) => {
  const seen = new Set<string>();
  const result: any[] = [];
  for (const photo of photos) {
    const key =
      (typeof photo.assetId === "number" && Number.isFinite(photo.assetId) ? `id:${photo.assetId}` : null) ??
      (photo.url ? `url:${photo.url}` : null);
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(photo);
  }
  return result;
};

const parseRelationshipCompass = (value: unknown): RelationshipCompass | null => {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as RelationshipCompass;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    return value as RelationshipCompass;
  }
  return null;
};

export const mapProfile = (row: any): Profile => {
  const mappedPhotos = (row.photos ?? [])
    .map((photo: any) => {
      const assetId = toNumericId(photo.assetId ?? photo.photoId);
      return {
        id: photo.id ?? String(assetId ?? Date.now()),
        url: photo.url ?? photo.signedUrl,
        createdAt: photo.createdAt ?? new Date().toISOString(),
        assetId,
        visibilityMode: photo.visibilityMode ?? photo.visibility_mode,
        storagePath: photo.storagePath ?? photo.storage_path
      };
    })
    // Only keep photos that are actually registered (have an assetId) and are not verification uploads.
    .filter(
      (photo) =>
        typeof photo.assetId === "number" &&
        Number.isFinite(photo.assetId) &&
        !isVerificationPhoto(photo)
    );

  const deduped = dedupePhotos(mappedPhotos);
  const relationshipCompass = parseRelationshipCompass(
    row.relationship_compass ?? row.relationshipCompass ?? null
  );

  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    birthday: row.birthday ?? row.birthdate,
    bio: row.bio ?? "",
    gender: row.gender,
    intention: row.intention,
    interests: row.interests ?? [],
    photos: deduped,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPremium: Boolean(row.is_premium),
    isIncognito: Boolean(row.is_incognito),
    hideNearby: Boolean(row.hide_nearby),
    hideNearbyRadius:
      typeof row.hide_nearby_radius === "number" && Number.isFinite(row.hide_nearby_radius)
        ? row.hide_nearby_radius
        : null,
    showDistance: row.show_distance ?? true,
    showLastSeen: row.show_last_seen ?? true,
    lastActiveAt: row.last_active_at ?? undefined,
    verified: Boolean(row.verified) || Boolean(row.verified_at),
    verifiedAt: row.verified_at ?? undefined,
    primaryPhotoPath: row.primary_photo_path ?? null,
    primaryPhotoId: toNumericId(row.primary_photo_id),
    verifiedFaceScore: typeof row.verified_face_score === "number" ? row.verified_face_score : null,
    relationshipCompass,
    regionCode: row.region_code ?? null,
    country: row.country ?? null,
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null
  };
};
