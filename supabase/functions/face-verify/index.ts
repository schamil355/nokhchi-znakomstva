import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import {
  CompareFacesCommand,
  DetectFacesCommand,
  RekognitionClient,
} from "npm:@aws-sdk/client-rekognition@3.637.0";

const PROFILE_BUCKET = Deno.env.get("PROFILE_BUCKET") ?? "photos_private";
const VERIFS_BUCKET = Deno.env.get("VERIFS_BUCKET") ?? "verifications";
const MATCH_THRESHOLD = Number(Deno.env.get("MATCH_THRESHOLD") ?? "0.82"); // expressed 0-1

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

type MatchResult = { isIdentical: boolean; confidence: number };

const awsRegion = Deno.env.get("AWS_REGION") ?? "eu-central-1";
const awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
const awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";

if (!awsAccessKeyId || !awsSecretAccessKey) {
  console.warn("[face-verify] AWS credentials missing – Rekognition calls will fail");
}

const rekognition = new RekognitionClient({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  },
});

const fetchImageBytes = async (signedUrl: string): Promise<Uint8Array> => {
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image ${signedUrl}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
};

const ensureSingleFace = async (imageBytes: Uint8Array) => {
  const cmd = new DetectFacesCommand({
    Image: { Bytes: imageBytes },
    Attributes: ["DEFAULT"],
  });
  const result = await rekognition.send(cmd);
  const faces = result.FaceDetails ?? [];
  if (faces.length === 0) {
    return { ok: false, reason: "NO_FACE_DETECTED" };
  }
  if (faces.length > 1) {
    return { ok: false, reason: "MULTIPLE_FACES_DETECTED" };
  }
  const confidence = faces[0]?.Confidence ?? 0;
  if (confidence < 80) {
    return { ok: false, reason: "FACE_CONFIDENCE_TOO_LOW" };
  }
  return { ok: true };
};

const performFaceMatch = async (profileUrl: string, selfieUrl: string): Promise<MatchResult> => {
  const [profileBytes, selfieBytes] = await Promise.all([
    fetchImageBytes(profileUrl),
    fetchImageBytes(selfieUrl),
  ]);

  const faceCheck = await ensureSingleFace(selfieBytes);
  if (!faceCheck.ok) {
    return { isIdentical: false, confidence: 0 };
  }

  const similarityThreshold = Math.min(99, Math.max(50, MATCH_THRESHOLD * 100));

  const command = new CompareFacesCommand({
    SourceImage: { Bytes: selfieBytes },
    TargetImage: { Bytes: profileBytes },
    SimilarityThreshold: similarityThreshold,
  });
  const response = await rekognition.send(command);
  const match = response.FaceMatches?.[0];
  const similarity = match?.Similarity ?? 0;
  const normalized = similarity / 100;

  return {
    isIdentical: normalized >= MATCH_THRESHOLD,
    confidence: normalized,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" }
      }
    });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }
    const uid = userData.user.id;

    const body = await req.json();
    const profilePath: string | undefined = body?.profilePath;
    const selfiePath: string | undefined = body?.selfiePath;

    if (!profilePath || !selfiePath) {
      return new Response("Missing paths", { status: 400, headers: corsHeaders });
    }
    if (!profilePath.startsWith(`${uid}/`) || !selfiePath.startsWith(`${uid}/`)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const profileSigned = await supabase.storage.from(PROFILE_BUCKET).createSignedUrl(profilePath, 60);
    const selfieSigned = await supabase.storage.from(VERIFS_BUCKET).createSignedUrl(selfiePath, 60);

    if (profileSigned.error || !profileSigned.data?.signedUrl) {
      return new Response("Profile URL error", { status: 500, headers: corsHeaders });
    }
    if (selfieSigned.error || !selfieSigned.data?.signedUrl) {
      return new Response("Selfie URL error", { status: 500, headers: corsHeaders });
    }

    const match = await performFaceMatch(profileSigned.data.signedUrl, selfieSigned.data.signedUrl);

    if (match.isIdentical) {
      await supabase
        .from("profiles")
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
          verified_face_score: match.confidence,
          verified_method: "selfie"
        })
        .eq("id", uid);
    }

    return new Response(JSON.stringify(match), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("face-verify error", error);
    return new Response("Internal Error", { status: 500, headers: corsHeaders });
  }
});
