import * as Localization from "expo-localization";
import { getSupabase, storageBucket } from "../../lib/supabase";
import { profileFormSchema, ProfileFormValues } from "./schema";
import { COUNTRY_CODES } from "./constants";
import { Coordinates, Profile, ProfilePhoto } from "../../types";

type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  birthdate: string;
  gender: string;
  orientation: string;
  interests: string[] | null;
  photos: Array<{ path: string }> | null;
  location: any;
  country: string | null;
  verified_at: string | null;
  verified_badge: string | null;
  verified_score: string | null;
  created_at: string;
  updated_at: string;
};

const PHOTO_SIGN_SECONDS = 60 * 60; // 1 hour

type CountryCode = (typeof COUNTRY_CODES)[number];

const resolveCountry = (value?: string | null): CountryCode => {
  if (value && COUNTRY_CODES.includes(value as CountryCode)) {
    return value as CountryCode;
  }
  const deviceCountry = Localization.region?.toUpperCase();
  if (deviceCountry && COUNTRY_CODES.includes(deviceCountry as CountryCode)) {
    return deviceCountry as CountryCode;
  }
  return COUNTRY_CODES[0];
};

const parseLocation = (value: any): Coordinates | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && Array.isArray(value.coordinates)) {
    const [lng, lat] = value.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return {
        latitude: lat,
        longitude: lng,
      };
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

const mapProfileRow = async (row: ProfileRow): Promise<Profile> => {
  const photos = await signPhotoPaths(row.photos ?? []);
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio ?? "",
    birthdate: row.birthdate,
    gender: row.gender as Profile["gender"],
    orientation: row.orientation as Profile["orientation"],
    interests: row.interests ?? [],
    photos,
    location: parseLocation(row.location),
    country: row.country,
    verifiedAt: row.verified_at,
    verifiedBadge: row.verified_badge,
    verifiedScore: row.verified_score ? Number(row.verified_score) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const signPhotoPaths = async (
  photos: Array<{ path: string }>,
): Promise<ProfilePhoto[]> => {
  if (!photos.length) {
    return [];
  }
  const bucket = storageBucket("photos");
  const { data, error } = await bucket.createSignedUrls(
    photos.map((photo) => photo.path),
    PHOTO_SIGN_SECONDS,
  );
  if (error) {
    throw error;
  }
  return photos.map((photo, index) => ({
    path: photo.path,
    url: data?.[index]?.signedUrl ?? "",
  }));
};

const toGeoPoint = (location?: Coordinates | null) => {
  if (!location) {
    return null;
  }
  return `SRID=4326;POINT(${location.longitude} ${location.latitude})`;
};

export const fetchProfileById = async (profileId: string): Promise<Profile | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, user_id, display_name, bio, birthdate, gender, orientation, interests, photos, location, country, verified_at, verified_badge, verified_score, created_at, updated_at",
    )
    .eq("id", profileId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProfileRow(data);
};

export const fetchProfileForUser = async (userId: string): Promise<Profile | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, user_id, display_name, bio, birthdate, gender, orientation, interests, photos, location, country, verified_at, verified_badge, verified_score, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapProfileRow(data);
};

export const upsertProfile = async (
  userId: string,
  values: ProfileFormValues,
): Promise<Profile> => {
  const supabase = getSupabase();
  const parsed = profileFormSchema.parse(values);

  const payload = {
    id: userId,
    user_id: userId,
    display_name: parsed.displayName,
    bio: parsed.bio ?? "",
    birthdate: parsed.birthdate,
    gender: parsed.gender,
    orientation: parsed.orientation,
    interests: parsed.interests,
    photos: parsed.photos.map((photo) => ({ path: photo.path })),
    location: toGeoPoint(parsed.location ?? null),
    country: parsed.country,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, user_id, display_name, bio, birthdate, gender, orientation, interests, photos, location, country, verified_at, verified_badge, verified_score, created_at, updated_at",
    )
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return mapProfileRow(data);
};

const detectMimeType = (uri: string, fallback = "image/jpeg") => {
  const extension = uri.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "heic":
      return "image/heic";
    case "webp":
      return "image/webp";
    default:
      return fallback;
  }
};

export const uploadProfilePhoto = async (
  userId: string,
  fileUri: string,
): Promise<ProfilePhoto> => {
  const bucket = storageBucket("photos");
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1_000_000)}.jpg`;
  const { error } = await bucket.upload(path, blob, {
    contentType: detectMimeType(fileUri),
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data, error: signedError } = await bucket.createSignedUrl(
    path,
    PHOTO_SIGN_SECONDS,
  );

  if (signedError || !data?.signedUrl) {
    throw signedError ?? new Error("Konnte signierte URL nicht erstellen.");
  }

  return {
    path,
    url: data.signedUrl,
  };
};

export const removeProfilePhoto = async (path: string): Promise<void> => {
  const bucket = storageBucket("photos");
  const { error } = await bucket.remove([path]);
  if (error) {
    throw error;
  }
};

export const profileToFormValues = (profile: Profile): ProfileFormValues => ({
  displayName: profile.displayName,
  bio: profile.bio,
  birthdate: profile.birthdate,
  gender: profile.gender,
  orientation: profile.orientation,
  interests: profile.interests,
  photos: profile.photos,
  location: profile.location ?? null,
  country: resolveCountry(profile.country),
});

export const isProfileComplete = (profile: Profile | null): boolean => {
  if (!profile) {
    return false;
  }
  return Boolean(profile.displayName && profile.birthdate && profile.photos.length > 0);
};
