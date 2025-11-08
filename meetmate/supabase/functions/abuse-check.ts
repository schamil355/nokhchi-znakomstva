import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Supabase environment variables missing");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ACTION_LIMITS: Record<string, { table: string; column: string; windowMinutes: number; maxActions: number }> = {
  like: {
    table: "likes",
    column: "liker",
    windowMinutes: 5,
    maxActions: 120
  },
  message: {
    table: "messages",
    column: "sender",
    windowMinutes: 5,
    maxActions: 160
  }
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const userId: string | undefined = payload?.userId ?? payload?.user_id;
    const action: string | undefined = payload?.action;

    if (!userId || !action) {
      return new Response(JSON.stringify({ allow: false, reason: "missing_parameters" }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const config = ACTION_LIMITS[action];
    if (!config) {
      return new Response(JSON.stringify({ allow: true }), { status: 200, headers: corsHeaders });
    }

    const since = new Date(Date.now() - config.windowMinutes * 60_000).toISOString();
    const { count, error } = await supabase
      .from(config.table)
      .select("id", { count: "exact", head: true })
      .eq(config.column, userId)
      .gte("created_at", since);

    if (error) {
      console.error("abuse-check error", error);
      return new Response(JSON.stringify({ allow: true }), { status: 200, headers: corsHeaders });
    }

    const actionCount = count ?? 0;
    if (actionCount >= config.maxActions) {
      return new Response(JSON.stringify({ allow: false, reason: "rate_limited" }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ allow: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("abuse-check failure", error);
    return new Response(JSON.stringify({ allow: true }), { status: 200, headers: corsHeaders });
  }
});
