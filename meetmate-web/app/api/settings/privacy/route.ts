import { NextResponse } from "next/server";
import { getAuthenticatedUser, getServerClient } from "@/lib/supabaseServer";

type PrivacyPayload = {
  is_incognito?: boolean;
  show_distance?: boolean;
  show_last_seen?: boolean;
};

const parsePayload = async (request: Request): Promise<PrivacyPayload | null> => {
  try {
    const json = (await request.json()) as PrivacyPayload;
    if (typeof json !== "object" || json === null) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
};

export const POST = async (request: Request) => {
  const supabase = getServerClient();
  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const updates: Record<string, boolean> = {};
  if (typeof payload.is_incognito === "boolean") updates.is_incognito = payload.is_incognito;
  if (typeof payload.show_distance === "boolean") updates.show_distance = payload.show_distance;
  if (typeof payload.show_last_seen === "boolean") updates.show_last_seen = payload.show_last_seen;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (updateError) {
    console.error("Failed to update privacy flags", updateError);
    return NextResponse.json({ message: "Unable to update privacy settings" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
};

export const GET = async (request: Request) => {
  const supabase = getServerClient();
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_incognito,show_distance,show_last_seen")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    console.error("Failed to load privacy settings", error);
    return NextResponse.json({ message: "Unable to load privacy settings" }, { status: 500 });
  }

  return NextResponse.json(profile);
};
