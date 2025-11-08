// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type PrivacyRequest = {
  type: "export" | "delete";
  userId: string;
};

const exportData = async (userId: string) => {
  const profile = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  const matches = await supabase
    .from("matches")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);
  const messages = await supabase
    .from("messages")
    .select("*")
    .or(`sender.eq.${userId},match_id.in.(select id from matches where user_a='${userId}' or user_b='${userId}')`);
  const likes = await supabase
    .from("likes")
    .select("*")
    .or(`liker.eq.${userId},liked.eq.${userId}`);
  const blocks = await supabase
    .from("blocks")
    .select("*")
    .or(`blocker.eq.${userId},blocked.eq.${userId}`);
  const reports = await supabase
    .from("reports")
    .select("*")
    .or(`reporter.eq.${userId},reported.eq.${userId}`);

  return {
    profile: profile.data,
    matches: matches.data,
    messages: messages.data,
    likes: likes.data,
    blocks: blocks.data,
    reports: reports.data
  };
};

const deleteData = async (userId: string) => {
  await supabase.from("messages").delete().or(`sender.eq.${userId}`);
  await supabase.from("likes").delete().or(`liker.eq.${userId},liked.eq.${userId}`);
  await supabase.from("blocks").delete().or(`blocker.eq.${userId},blocked.eq.${userId}`);
  await supabase.from("reports").delete().or(`reporter.eq.${userId},reported.eq.${userId}`);
  await supabase.from("matches").delete().or(`user_a.eq.${userId},user_b.eq.${userId}`);
  await supabase.from("profiles").delete().eq("id", userId);

  try {
    await supabase.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error("deleteUser", error);
  }
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  const payload = (await req.json()) as PrivacyRequest;
  if (!payload?.userId || !payload?.type) {
    return new Response(JSON.stringify({ error: "invalid_payload" }), { status: 400 });
  }

  if (payload.type === "export") {
    const data = await exportData(payload.userId);
    return new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
  }

  await deleteData(payload.userId);
  return new Response(JSON.stringify({ status: "deleted" }));
});
