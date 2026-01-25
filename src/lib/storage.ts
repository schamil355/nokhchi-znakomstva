import type { SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const PROFILE_BUCKET =
  extra?.EXPO_PUBLIC_PROFILE_BUCKET ?? process.env.EXPO_PUBLIC_PROFILE_BUCKET ?? "photos_private";
export const BLURRED_BUCKET =
  extra?.EXPO_PUBLIC_BLURRED_BUCKET ?? process.env.EXPO_PUBLIC_BLURRED_BUCKET ?? "photos_blurred";
export const STORAGE_PUBLIC =
  String(extra?.EXPO_PUBLIC_STORAGE_PUBLIC ?? process.env.EXPO_PUBLIC_STORAGE_PUBLIC ?? "false") === "true";

export const getPhotoUrl = async (
  storagePath: string,
  supabase: SupabaseClient,
  bucket = PROFILE_BUCKET,
  ttlSeconds = 3600
) => {
  const key = storagePath.startsWith(`${bucket}/`)
    ? storagePath.slice(bucket.length + 1)
    : storagePath;

  const isPublic = STORAGE_PUBLIC;

  if (isPublic) {
    return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl ?? "";
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Failed to create signed URL");
  }
  return data.signedUrl;
};

export const buildBlurredPath = (originalPath: string) => {
  const dotIndex = originalPath.lastIndexOf(".");
  if (dotIndex === -1) {
    return `${originalPath}_blur.jpg`;
  }
  const base = originalPath.slice(0, dotIndex);
  const ext = originalPath.slice(dotIndex);
  return `${base}_blur${ext}`;
};
