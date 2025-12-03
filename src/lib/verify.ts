import { Platform } from "react-native";
import { getSupabaseClient } from "./supabaseClient";
import { getPhotoUrl, PROFILE_BUCKET } from "./storage";

const VERIFY_PROVIDER = process.env.EXPO_PUBLIC_VERIFY_PROVIDER ?? "dev";
const VERIFY_ENDPOINT = process.env.EXPO_PUBLIC_VERIFY_ENDPOINT;

const supabase = getSupabaseClient();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPrimaryPhotoUrl = async (): Promise<string | null> => {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("primary_photo_path")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  let path = data?.primary_photo_path ?? null;
  if (!path) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("photo_assets")
      .select("storage_path")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (fallbackError || !fallback?.storage_path) {
      return null;
    }
    path = fallback.storage_path;
  }
  const url = await getPhotoUrl(path, supabase, PROFILE_BUCKET);
  return url;
};

export const verifyWithProvider = async (selfieUri: string): Promise<boolean> => {
  if (VERIFY_PROVIDER === "dev" || !VERIFY_ENDPOINT) {
    // DEV stub: simulate processing delay
    await sleep(800);
    return true;
  }

  const profileUrl = await getPrimaryPhotoUrl();
  if (!profileUrl) {
    return false;
  }

  const selfieBlob = await fetch(selfieUri).then((response) => response.blob());
  const response = await fetch(VERIFY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-profile-url": profileUrl,
      "x-platform": Platform.OS
    },
    body: selfieBlob
  });

  if (!response.ok) {
    return false;
  }
  try {
    const payload = await response.json();
    return Boolean(payload?.matched ?? payload?.score >= 0.5);
  } catch (error) {
    console.warn("[Verify] invalid response", error);
    return false;
  }
};

export const markProfileVerified = async (confidence?: number | null) => {
  const {
    data: { session }
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error("not authenticated");
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      verified_method: "selfie",
      verified_face_score: confidence ?? null
    })
    .eq("id", session.user.id);
  if (error) {
    throw error;
  }
};
