import { NextResponse } from "next/server";
import { getAdminClient, getAuthenticatedUser } from "@/lib/supabaseServer";
import { canAccessOriginal, type VisibilityMode } from "@/lib/privacyVisibility";

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const SIGN_TTL_SECONDS = Number(process.env.SIGN_TTL_SECONDS ?? 120);
const RATE_LIMIT = Number(process.env.PHOTO_SIGN_RATE_LIMIT ?? 30);

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400"
};

const withCors = (response: NextResponse) => {
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

export const OPTIONS = () => new Response(null, { status: 204, headers: corsHeaders });

type SignPayload = {
  photoId?: number;
  variant?: "original" | "blur";
};

type RateEntry = { count: number; resetAt: number };
const rateCache = new Map<string, RateEntry>();

const checkRateLimit = (userId: string, photoId: number): boolean => {
  const key = `${userId}:${photoId}`;
  const now = Date.now();
  const entry = rateCache.get(key);
  if (!entry || now >= entry.resetAt) {
    rateCache.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  entry.count += 1;
  return true;
};

const hasWhitelistEntry = async (photoId: number, viewerId: string) => {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("photo_permissions")
    .select("viewer_id,expires_at")
    .eq("photo_id", photoId)
    .eq("viewer_id", viewerId)
    .maybeSingle();

  if (error) {
    console.warn("photo_permissions lookup failed", error);
    return false;
  }

  if (!data) return false;
  if (!data.expires_at) return true;
  return new Date(data.expires_at).getTime() > Date.now();
};

const hasMatch = async (ownerId: string, viewerId: string) => {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("id")
    .or(`and(user_a.eq.${ownerId},user_b.eq.${viewerId}),and(user_a.eq.${viewerId},user_b.eq.${ownerId})`)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("Match check failed", error);
    return false;
  }
  return Boolean(data);
};

const getBlurUrl = async (path: string) => {
  const admin = getAdminClient();
  const { data } = admin.storage.from("photos_blurred").getPublicUrl(path);
  return data.publicUrl;
};

export const POST = async (request: Request) => {
  const admin = getAdminClient();
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return withCors(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
  }

  let payload: SignPayload;
  try {
    payload = (await request.json()) as SignPayload;
  } catch {
    return withCors(NextResponse.json({ message: "Invalid JSON" }, { status: 400 }));
  }

  const photoId = payload.photoId;
  if (!photoId || Number.isNaN(photoId)) {
    return withCors(NextResponse.json({ message: "photoId required" }, { status: 400 }));
  }

  if (!checkRateLimit(user.id, photoId)) {
    return withCors(NextResponse.json({ message: "Rate limit exceeded" }, { status: 429 }));
  }

  const { data: asset, error: assetError } = await admin
    .from("photo_assets")
    .select("id,owner_id,storage_path,blurred_path,visibility_mode")
    .eq("id", photoId)
    .single();

  if (assetError || !asset) {
    console.error("Photo asset lookup failed", assetError);
    return withCors(NextResponse.json({ message: "Photo not found" }, { status: 404 }));
  }

  const mode = asset.visibility_mode as VisibilityMode;
  const isOwner = user.id === asset.owner_id;
  const whitelist = isOwner ? true : await hasWhitelistEntry(asset.id, user.id);
  const match = isOwner ? true : await hasMatch(asset.owner_id, user.id);

  const canViewOriginal = canAccessOriginal({
    mode,
    isOwner,
    hasMatch: match,
    hasWhitelist: whitelist
  });

  const requestedVariant = payload.variant ?? "original";
  const deliverVariant: "original" | "blur" =
    requestedVariant === "blur" ? "blur" : canViewOriginal ? "original" : "blur";

  try {
    if (deliverVariant === "original") {
      const { data, error } = await admin.storage.from("photos_private").createSignedUrl(asset.storage_path, SIGN_TTL_SECONDS);
      if (error || !data?.signedUrl) {
        throw error ?? new Error("Failed to sign private photo");
      }
      console.info("photo.sign.success", { photoId: asset.id, viewer: user.id, variant: "original" });
      return withCors(
        NextResponse.json({
          url: data.signedUrl,
          expiresIn: SIGN_TTL_SECONDS,
          variant: "original"
        })
      );
    }

    const blurredPath = asset.blurred_path ?? asset.storage_path;
    const blurUrl = await getBlurUrl(blurredPath);
    console.info("photo.sign.success", { photoId: asset.id, viewer: user.id, variant: "blur" });
    return withCors(
      NextResponse.json({
        url: blurUrl,
        expiresIn: SIGN_TTL_SECONDS,
        variant: "blur"
      })
    );
  } catch (error) {
    console.error("Failed to sign photo", error);
    return withCors(NextResponse.json({ message: "Unable to sign photo" }, { status: 500 }));
  }
};
