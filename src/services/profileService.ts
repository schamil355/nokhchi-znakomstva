import { z } from "zod";
import { getSupabaseClient } from "../lib/supabaseClient";
import { createRateLimiter } from "../lib/rateLimiter";
import { Profile, Intention, Gender } from "../types";
import { useAuthStore } from "../state/authStore";

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
  )
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
      show_distance,
      show_last_seen
    `
    )
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return mapProfile(data);
};

export type ProfileInput = z.infer<typeof profileSchema>;

export const upsertProfile = async (userId: string, input: ProfileInput): Promise<Profile> =>
  updateLimiter(async () => {
    const supabase = getSupabaseClient();
    const parsed = profileSchema.parse(input);
    const payload = {
      user_id: userId,
      display_name: parsed.displayName,
      birthday: parsed.birthday,
      bio: parsed.bio,
      gender: parsed.gender,
      intention: parsed.intention,
      interests: parsed.interests,
      photos: parsed.photos,
      is_premium: parsed.photos.length >= 3 ? true : parsed.photos.some((photo) => photo.url.includes("premium")),
      updated_at: new Date().toISOString()
    };

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

export const removeProfilePhoto = async (photoId: string) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from("profile-photos").remove([photoId]);
  if (error) {
    throw error;
  }
};

export const mapProfile = (row: any): Profile => ({
  id: row.id,
  userId: row.user_id,
  displayName: row.display_name,
  birthday: row.birthday,
  bio: row.bio ?? "",
  gender: row.gender,
  intention: row.intention,
  interests: row.interests ?? [],
  photos: (row.photos ?? []).map((photo: any) => ({
    id: photo.id ?? String(photo.assetId ?? photo.photoId ?? Date.now()),
    url: photo.url ?? photo.signedUrl,
    createdAt: photo.createdAt ?? new Date().toISOString(),
    assetId: typeof photo.assetId === "number" ? photo.assetId : photo.photoId,
    visibilityMode: photo.visibilityMode ?? photo.visibility_mode
  })),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isPremium: Boolean(row.is_premium),
  isIncognito: Boolean(row.is_incognito),
  showDistance: row.show_distance ?? true,
  showLastSeen: row.show_last_seen ?? true,
  lastActiveAt: row.last_active_at ?? undefined
});
