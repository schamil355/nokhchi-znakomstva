// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

type MatchPayload = {
  type: "match";
  matchId: string;
  receiverId: string;
  actorId: string;
};

type MessagePayload = {
  type: "message";
  matchId: string;
  receiverId: string;
  actorId: string;
  preview: string;
};

type RequestPayload = MatchPayload | MessagePayload;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_KEY ?? "");

const sendPushAsync = async (messages: Record<string, any>[]) => {
  if (!messages.length) return;
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {})
    },
    body: JSON.stringify(messages)
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("Expo push error", body);
  }
};

const fetchTokens = async (userId: string) => {
  const { data, error } = await supabase.from("device_tokens").select("token").eq("user_id", userId);
  if (error) {
    console.error("Failed to load tokens", error);
    return [] as string[];
  }
  return (data ?? []).map((row) => row.token);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  const body = (await req.json()) as RequestPayload;

  if (!body || !body.type) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400 });
  }

  const tokens = await fetchTokens(body.receiverId);
  if (!tokens.length) {
    return new Response(JSON.stringify({ status: "no_tokens" }));
  }

  let title = "";
  let message = "";
  let data: Record<string, string> = {};

  if (body.type === "match") {
    title = "Neues Match";
    message = "Ihr mögt euch gegenseitig!";
    data = { type: "match", matchId: body.matchId, actorId: body.actorId };
  } else {
    title = "Neue Nachricht";
    message = body.preview;
    data = { type: "message", matchId: body.matchId, actorId: body.actorId };
  }

  await sendPushAsync(
    tokens.map((token) => ({
      to: token,
      title,
      body: message,
      data
    }))
  );

  return new Response(JSON.stringify({ status: "ok" }));
});
