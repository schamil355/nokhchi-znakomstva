#!/usr/bin/env node
// Create two test users (female + male) in Chechnya for discovery testing.
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SEED_PASSWORD=... node scripts/seed-chechnya-test-users.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD ?? "TestChechnya123!";
const RUN_TAG = process.env.SEED_RUN_TAG ?? Date.now().toString(36);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CHECHNYA_COORDS = { latitude: 43.3189, longitude: 45.6981 };

const USERS = [
  {
    label: "chechnya-female",
    gender: "female",
    displayName: "Chechnya Test (F)",
    email: process.env.SEED_FEMALE_EMAIL ?? `chechnya.female.${RUN_TAG}@example.com`,
    birthday: "2000-05-12"
  },
  {
    label: "chechnya-male",
    gender: "male",
    displayName: "Chechnya Test (M)",
    email: process.env.SEED_MALE_EMAIL ?? `chechnya.male.${RUN_TAG}@example.com`,
    birthday: "1998-09-03"
  }
];

const findUserIdByEmail = async (email) => {
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 2000 });
  if (error) {
    throw error;
  }
  const user = data?.users?.find((u) => u.email === email);
  return user?.id ?? null;
};

const ensureUser = async ({ email, displayName }) => {
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName }
  });

  if (error) {
    if (String(error.message ?? "").toLowerCase().includes("registered")) {
      const existingId = await findUserIdByEmail(email);
      if (!existingId) {
        throw error;
      }
      await client.auth.admin.updateUserById(existingId, {
        password: PASSWORD,
        user_metadata: { display_name: displayName }
      });
      return existingId;
    }
    throw error;
  }

  if (!data?.user?.id) {
    throw new Error(`Failed to create user for ${email}`);
  }

  return data.user.id;
};

const upsertProfile = async (userId, { displayName, gender, birthday }) => {
  const payload = {
    id: userId,
    user_id: userId,
    display_name: displayName,
    bio: "Test account for Chechnya discovery.",
    birthday,
    gender,
    intention: "serious",
    interests: [],
    photos: [],
    country: "RU",
    region_code: "CHECHNYA",
    latitude: CHECHNYA_COORDS.latitude,
    longitude: CHECHNYA_COORDS.longitude,
    is_incognito: false,
    hide_nearby: false,
    hide_nearby_radius: 15,
    show_distance: true,
    show_last_seen: true,
    verified: true,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    throw error;
  }
};

const main = async () => {
  const results = [];
  for (const user of USERS) {
    const userId = await ensureUser(user);
    await upsertProfile(userId, user);
    results.push({ email: user.email, password: PASSWORD, gender: user.gender });
  }

  console.log("Seed complete. Credentials:");
  results.forEach((r) => {
    console.log(`  ${r.email} / ${r.password} (${r.gender})`);
  });
};

main().catch((error) => {
  console.error("Seeding failed:", error?.message ?? error);
  process.exit(1);
});
