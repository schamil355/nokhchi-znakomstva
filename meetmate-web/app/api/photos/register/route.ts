import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminClient, getAuthenticatedUser } from "@/lib/supabaseServer";

const ALLOWED_VISIBILITY = new Set(["public", "match_only", "whitelist", "blurred_until_match"]);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400"
};

const withCors = (response: NextResponse) => {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
};

export const OPTIONS = () => new Response(null, { status: 204, headers: corsHeaders });

type RegisterPayload = {
  storagePath?: string;
  visibility_mode?: string;
};

export const POST = async (request: Request) => {
  const admin = getAdminClient();

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return withCors(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
  }

  let payload: RegisterPayload;
  try {
    payload = (await request.json()) as RegisterPayload;
  } catch {
    return withCors(NextResponse.json({ message: "Invalid JSON body" }, { status: 400 }));
  }

  const storagePath = payload.storagePath?.trim();
  const visibilityMode = payload.visibility_mode?.trim();

  if (!storagePath || !visibilityMode || !ALLOWED_VISIBILITY.has(visibilityMode)) {
    return withCors(NextResponse.json({ message: "Invalid payload" }, { status: 400 }));
  }

  const { data: objectRow, error: objectError } = await admin
    .from("storage.objects")
    .select("bucket_id,name,owner")
    .eq("bucket_id", "photos_private")
    .eq("name", storagePath)
    .single();

  if (objectError || !objectRow) {
    console.error("Storage object lookup failed", objectError);
    return withCors(NextResponse.json({ message: "File not found" }, { status: 404 }));
  }

  if (objectRow.owner !== user.id) {
    return withCors(NextResponse.json({ message: "Forbidden" }, { status: 403 }));
  }

  const downloadResponse = await admin.storage.from("photos_private").download(storagePath);
  if (downloadResponse.error || !downloadResponse.data) {
    console.error("Download failed", downloadResponse.error);
    return withCors(NextResponse.json({ message: "Unable to download original photo" }, { status: 500 }));
  }

  let blurredBuffer: Buffer;
  try {
    blurredBuffer = await sharp(await downloadResponse.data.arrayBuffer())
      .resize(200, 200, { fit: "cover" })
      .blur(50)
      .jpeg({ quality: 40 })
      .toBuffer();
  } catch (processingError) {
    console.error("Image processing failed", processingError);
    return withCors(NextResponse.json({ message: "Unable to process image" }, { status: 500 }));
  }

  const uploadResult = await admin.storage.from("photos_blurred").upload(storagePath, blurredBuffer, {
    upsert: true,
    contentType: "image/jpeg"
  });

  if (uploadResult.error) {
    console.error("Blurred upload failed", uploadResult.error);
    return withCors(NextResponse.json({ message: "Unable to upload blurred variant" }, { status: 500 }));
  }

  const { data: asset, error: assetError } = await admin
    .from("photo_assets")
    .insert({
      owner_id: user.id,
      storage_path: storagePath,
      blurred_path: storagePath,
      visibility_mode: visibilityMode
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    console.error("Failed to register photo asset", assetError);
    return withCors(NextResponse.json({ message: "Unable to register photo" }, { status: 500 }));
  }

  return withCors(NextResponse.json({ photoId: asset.id }, { status: 201 }));
};
