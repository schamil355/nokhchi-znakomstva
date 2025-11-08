/*
 * Supabase Edge Function: geo
 * Determines the requester country based on headers with fallback to Accept-Language.
 */

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const normalizeCountry = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 2).toUpperCase();
};

const extractFromAcceptLanguage = (header: string | null): string | null => {
  if (!header) return null;
  const firstToken = header.split(",")[0];
  if (!firstToken) return null;
  const parts = firstToken.split("-");
  const region = parts.length > 1 ? parts[1] : parts[0];
  return normalizeCountry(region);
};

serve((request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = request.headers;
  const candidates = [
    normalizeCountry(headers.get("cf-ipcountry")),
    normalizeCountry(headers.get("x-country")),
    normalizeCountry(headers.get("x-vercel-ip-country")),
    extractFromAcceptLanguage(headers.get("accept-language"))
  ];

  const countryCode = candidates.find((code): code is string => Boolean(code)) ?? null;

  return new Response(JSON.stringify({ countryCode }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
});
