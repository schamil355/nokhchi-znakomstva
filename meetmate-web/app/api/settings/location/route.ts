import { NextResponse } from "next/server";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

type LocationPayload = {
  latitude?: number;
  longitude?: number;
  country?: string | null;
};

const parsePayload = async (request: Request): Promise<LocationPayload | null> => {
  try {
    const json = (await request.json()) as LocationPayload;
    if (typeof json !== "object" || json === null) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
};

const normalizeCountry = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 2).toUpperCase();
};

export const POST = async (request: Request) => {
  const supabase = getServerClient();
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await parsePayload(request);
  if (!payload) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const latitude = typeof payload.latitude === "number" ? payload.latitude : null;
  const longitude = typeof payload.longitude === "number" ? payload.longitude : null;

  if (latitude == null || longitude == null) {
    return NextResponse.json({ message: "Missing coordinates" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    id: user.id,
    user_id: user.id,
    latitude,
    longitude,
    country: normalizeCountry(payload.country),
    updated_at: new Date().toISOString(),
    location_updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("profiles").upsert(updates, { onConflict: "id" });
  if (error) {
    console.error("Failed to update location", error);
    return NextResponse.json({ message: "Unable to update location" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};

export const GET = async (request: Request) => {
  const supabase = getServerClient();
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("latitude,longitude,country")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load location", error);
    return NextResponse.json({ message: "Unable to load location" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ latitude: null, longitude: null, country: null });
  }

  return NextResponse.json({
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    country: data.country ?? null
  });
};
