#!/usr/bin/env node
/**
 * Backfill city names for profiles using Mapbox Geocoding.
 * Requirements:
 *  - ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MAPBOX_TOKEN
 *  - Node 18+ (fetch vorhanden)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... MAPBOX_TOKEN=... node scripts/backfill-city-geocode.js
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mapboxToken = process.env.MAPBOX_TOKEN;

if (!supabaseUrl || !supabaseKey || !mapboxToken) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or MAPBOX_TOKEN");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const geocodeCity = async (lat, lon) => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${mapboxToken}&limit=1&language=en`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Mapbox error ${res.status}${body ? ` - ${body.slice(0, 200)}` : ""}`);
  }
  const json = await res.json();
  const feature = json?.features?.[0];
  if (!feature) return null;
  // Prefer place or city text
  const context = feature.context ?? [];
  const neighbourhood = context.find((c) => c.id?.startsWith("neighborhood"))?.text;
  const place = context.find((c) => c.id?.startsWith("place"))?.text;
  const region = context.find((c) => c.id?.startsWith("region"))?.text;
  const country = context.find((c) => c.id?.startsWith("country"))?.short_code?.toUpperCase();
  const city = place ?? feature.text ?? region ?? country ?? null;
  const district = neighbourhood ?? place ?? null;
  return { city, district };
};

const PAGE_SIZE = 100;

const run = async () => {
  console.log("Backfill start");
  let processed = 0;
  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, latitude, longitude")
      .is("city", null)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(PAGE_SIZE);

    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      console.log("Done. No more rows.");
      break;
    }

    for (const row of data) {
      try {
        const result = await geocodeCity(row.latitude, row.longitude);
        if (!result?.city && !result?.district) {
          console.warn(`No city/district for ${row.id}`);
          continue;
        }
        const payload = {};
        if (result.city) payload.city = result.city;
        if (result.district) payload.district = result.district;
        const { error: updateError } = await supabase.from("profiles").update(payload).eq("id", row.id);
        if (updateError) {
          console.error(`Update failed for ${row.id}:`, updateError.message);
        } else {
          console.log(`Updated ${row.id} -> city: ${payload.city ?? "-"}, district: ${payload.district ?? "-"}`);
        }
      } catch (err) {
        console.error(`Geocode failed for ${row.id}:`, err.message);
      }
      await sleep(300); // simple rate-limit
    }

    processed += data.length;
    console.log(`Processed ${processed} rows so far...`);
    await sleep(500);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
