#!/usr/bin/env node
// Seed 30 female test profiles per region (Chechnya, Russia, Europe, Other) for discovery testing.
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-discovery-profiles.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD ?? "SeedUser123!";
const PER_REGION = 30;
const RUN_TAG = process.env.SEED_RUN_TAG ?? Date.now().toString(36);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const REGIONS = {
  chechnya: {
    country: "RU",
    region_code: "CHECHNYA",
    latitude: 43.3189,
    longitude: 45.6981
  },
  russia: {
    country: "RU",
    region_code: "RU",
    latitude: 55.7558,
    longitude: 37.6173
  },
  europe: {
    country: "DE",
    region_code: "DE",
    latitude: 52.52,
    longitude: 13.405
  },
  other: {
    country: "US",
    region_code: "US",
    latitude: 40.7128,
    longitude: -74.006
  }
};

const pad = (value) => String(value).padStart(2, "0");

const makeBirthday = (index) => {
  const year = 1991 + (index % 12); // 1991-2002
  const month = ((index % 12) + 1).toString().padStart(2, "0");
  const day = ((index % 27) + 1).toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const interestsPool = ["music", "travel", "sports", "books", "movies", "fitness"];

const createSeedProfile = async (regionKey, idx) => {
  const region = REGIONS[regionKey];
  const label = `${regionKey}-${pad(idx + 1)}`;
  const email = `seed+${label}-${RUN_TAG}@example.com`;
  const displayName = `Seed ${label}`;
  const birthday = makeBirthday(idx);
  const interests = [interestsPool[idx % interestsPool.length], interestsPool[(idx + 2) % interestsPool.length]];

  const { data: userData, error: userError } = await client.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName, seed_region: regionKey }
  });

  if (userError || !userData?.user?.id) {
    throw new Error(`Failed to create user ${email}: ${userError?.message ?? "unknown error"}`);
  }

  const userId = userData.user.id;
  const profilePayload = {
    id: userId,
    user_id: userId,
    display_name: displayName,
    bio: "Seed profile for discovery testing",
    birthday,
    gender: "female",
    intention: "serious",
    interests,
    photos: [],
    country: region.country,
    region_code: region.region_code,
    latitude: region.latitude,
    longitude: region.longitude,
    is_incognito: false,
    hide_nearby: false,
    hide_nearby_radius: 15,
    show_distance: true,
    show_last_seen: true,
    updated_at: new Date().toISOString()
  };

  const { error: profileError } = await client.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (profileError) {
    throw new Error(`Failed to upsert profile for ${email}: ${profileError.message}`);
  }

  return { email, password: PASSWORD, region: regionKey };
};

const main = async () => {
  console.log(`Seeding ${PER_REGION} female profiles per region (run tag: ${RUN_TAG})...`);
  const results = [];

  for (const regionKey of Object.keys(REGIONS)) {
    console.log(`\nRegion: ${regionKey}`);
    for (let i = 0; i < PER_REGION; i++) {
      const result = await createSeedProfile(regionKey, i);
      console.log(`  ✅ ${result.email}`);
      results.push(result);
    }
  }

  console.log("\nDone. Sample credentials:");
  results.slice(0, 3).forEach((r) => {
    console.log(`  ${r.email} / ${r.password} (${r.region})`);
  });
  console.log("\nRe-run note: each run creates new emails (run tag changes). Set SEED_RUN_TAG to reuse a tag.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
