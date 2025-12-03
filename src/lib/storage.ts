import type { SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const PROFILE_BUCKET =
  extra?.EXPO_PUBLIC_PROFILE_BUCKET ?? process.env.EXPO_PUBLIC_PROFILE_BUCKET ?? "profile-photos";

export const getPhotoUrl = async (
  storagePath: string,
  supabase: SupabaseClient,
  bucket = PROFILE_BUCKET,
  ttlSeconds = 3600
) => {
  const key = storagePath.startsWith(`${bucket}/`)
    ? storagePath.slice(bucket.length + 1)
    : storagePath;

  const isPublic =
    String(extra?.EXPO_PUBLIC_STORAGE_PUBLIC ?? process.env.EXPO_PUBLIC_STORAGE_PUBLIC ?? "true") === "true";

  if (isPublic) {
    return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl ?? "";
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed URL");
  }
  return data.signedUrl;
};
