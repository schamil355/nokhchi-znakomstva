#!/usr/bin/env node
// Seed 20 female + 1 male EU users into a Supabase project (auth + profiles).
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-production-users.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD ?? "Demo1234!";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const COORDS_BY_COUNTRY = {
  DE: { latitude: 52.52, longitude: 13.405 },
  FR: { latitude: 48.8566, longitude: 2.3522 },
  ES: { latitude: 40.4168, longitude: -3.7038 },
  IT: { latitude: 41.9028, longitude: 12.4964 },
  NL: { latitude: 52.3676, longitude: 4.9041 },
  AT: { latitude: 48.2082, longitude: 16.3738 },
  SE: { latitude: 59.3293, longitude: 18.0686 },
  BE: { latitude: 50.8503, longitude: 4.3517 },
  CZ: { latitude: 50.0755, longitude: 14.4378 },
  PL: { latitude: 52.2297, longitude: 21.0122 },
  PT: { latitude: 38.7223, longitude: -9.1393 },
  DK: { latitude: 55.6761, longitude: 12.5683 },
  FI: { latitude: 60.1699, longitude: 24.9384 },
  RO: { latitude: 44.4268, longitude: 26.1025 },
  HU: { latitude: 47.4979, longitude: 19.0402 },
  GR: { latitude: 37.9838, longitude: 23.7275 },
  IE: { latitude: 53.3498, longitude: -6.2603 },
  SK: { latitude: 48.1486, longitude: 17.1077 },
  HR: { latitude: 45.815, longitude: 15.9819 },
  BG: { latitude: 42.6977, longitude: 23.3219 },
};

const USERS = [
  {
    email: "amina.eu@example.com",
    displayName: "Amina",
    gender: "female",
    orientation: "men",
    birthday: "1997-04-12",
    country: "DE",
    bio: "UX Designerin, liebt Third-Wave-Kaffee und Spaziergaenge am Fluss.",
    photoUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    interests: ["Reisen", "Kunst", "Musik"],
    verified: true,
  },
  {
    email: "fatima.eu@example.com",
    displayName: "Fatima",
    gender: "female",
    orientation: "men",
    birthday: "1995-09-03",
    country: "FR",
    bio: "Foodie, testet neue Bistros und sammelt Rezepte aus Paris.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
    interests: ["Kulinarik", "Reisen", "Natur"],
    verified: false,
  },
  {
    email: "elena.eu@example.com",
    displayName: "Elena",
    gender: "female",
    orientation: "men",
    birthday: "1998-01-21",
    country: "ES",
    bio: "Liebt Strandlaeufe, Tapas und kleine Fototouren.",
    photoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    interests: ["Fotografie", "Reisen", "Sport"],
    verified: false,
  },
  {
    email: "sofia.eu@example.com",
    displayName: "Sofia",
    gender: "female",
    orientation: "men",
    birthday: "1996-06-15",
    country: "IT",
    bio: "Kocht gern italienisch, plant Citytrips und geht gern ins Museum.",
    photoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    interests: ["Kunst", "Reisen", "Kulinarik"],
    verified: false,
  },
  {
    email: "mila.eu@example.com",
    displayName: "Mila",
    gender: "female",
    orientation: "men",
    birthday: "1999-11-02",
    country: "NL",
    bio: "Radelt durch die Stadt, mag Designmaerkte und Eiskaffee.",
    photoUrl:
      "https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80",
    interests: ["Sport", "Kunst", "Reisen"],
    verified: false,
  },
  {
    email: "klara.eu@example.com",
    displayName: "Klara",
    gender: "female",
    orientation: "men",
    birthday: "1994-05-09",
    country: "AT",
    bio: "Laeuft morgens im Park, hoert Podcasts und arbeitet im Marketing.",
    photoUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    interests: ["Sport", "Natur", "Technologie"],
    verified: true,
  },
  {
    email: "nora.eu@example.com",
    displayName: "Nora",
    gender: "female",
    orientation: "men",
    birthday: "2000-02-18",
    country: "SE",
    bio: "Nordlicht, gern im Sauna-Club und bei langen Fahrradtouren.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
    interests: ["Wellness", "Sport", "Natur"],
    verified: false,
  },
  {
    email: "lea.eu@example.com",
    displayName: "Lea",
    gender: "female",
    orientation: "men",
    birthday: "1995-12-11",
    country: "BE",
    bio: "Verbringt Wochenenden in den Bergen und liebt Buchlaeden.",
    photoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    interests: ["Natur", "Lesen", "Reisen"],
    verified: true,
  },
  {
    email: "jana.eu@example.com",
    displayName: "Jana",
    gender: "female",
    orientation: "men",
    birthday: "1997-07-08",
    country: "CZ",
    bio: "Data Analystin, mag Yoga, Jazz und gemuetliche Cafes.",
    photoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    interests: ["Musik", "Wellness", "Technologie"],
    verified: false,
  },
  {
    email: "maja.eu@example.com",
    displayName: "Maja",
    gender: "female",
    orientation: "men",
    birthday: "1993-03-30",
    country: "PL",
    bio: "Product Ownerin, liebt Roadtrips und Street-Food.",
    photoUrl:
      "https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80",
    interests: ["Reisen", "Kulinarik", "Startups"],
    verified: false,
  },
  {
    email: "sara.eu@example.com",
    displayName: "Sara",
    gender: "female",
    orientation: "men",
    birthday: "1998-08-27",
    country: "PT",
    bio: "Reist gern ans Meer, sammelt Vinyl und singt im Chor.",
    photoUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    interests: ["Musik", "Reisen", "Natur"],
    verified: false,
  },
  {
    email: "lara.eu@example.com",
    displayName: "Lara",
    gender: "female",
    orientation: "men",
    birthday: "1996-10-10",
    country: "DK",
    bio: "Sammelt Vintage, mag Kunstausstellungen und Espresso.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
    interests: ["Kunst", "Reisen", "Kulinarik"],
    verified: false,
  },
  {
    email: "tessa.eu@example.com",
    displayName: "Tessa",
    gender: "female",
    orientation: "men",
    birthday: "1997-01-05",
    country: "FI",
    bio: "Mag Hygge-Abende, Brettspiele und Hafenluft.",
    photoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    interests: ["Lesen", "Natur", "Gaming"],
    verified: false,
  },
  {
    email: "alina.eu@example.com",
    displayName: "Alina",
    gender: "female",
    orientation: "men",
    birthday: "1994-09-19",
    country: "RO",
    bio: "Organisiert Kunst-Workshops, liebt Wochenmarkt und Weinbars.",
    photoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    interests: ["Kunst", "Kulinarik", "Natur"],
    verified: false,
  },
  {
    email: "petra.eu@example.com",
    displayName: "Petra",
    gender: "female",
    orientation: "men",
    birthday: "1995-02-24",
    country: "HU",
    bio: "Architektur-Fan, mag Flohmaerkte und Nachtspaziergaenge.",
    photoUrl:
      "https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80",
    interests: ["Kunst", "Natur", "Reisen"],
    verified: false,
  },
  {
    email: "iris.eu@example.com",
    displayName: "Iris",
    gender: "female",
    orientation: "men",
    birthday: "1999-04-06",
    country: "GR",
    bio: "Inselmaedchen, liebt Meeresrauschen und Laufstrecken am Wasser.",
    photoUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    interests: ["Natur", "Sport", "Reisen"],
    verified: false,
  },
  {
    email: "noemi.eu@example.com",
    displayName: "Noemi",
    gender: "female",
    orientation: "men",
    birthday: "1997-12-22",
    country: "IE",
    bio: "Mag Wochenendtrips, laeuft Halbmarathons und fotografiert gern.",
    photoUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80",
    interests: ["Sport", "Fotografie", "Reisen"],
    verified: true,
  },
  {
    email: "daria.eu@example.com",
    displayName: "Daria",
    gender: "female",
    orientation: "men",
    birthday: "1996-01-29",
    country: "SK",
    bio: "Spielt Volleyball, liebt Waldspaziergaenge und Backen.",
    photoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    interests: ["Sport", "Natur", "Kochen"],
    verified: false,
  },
  {
    email: "mira.eu@example.com",
    displayName: "Mira",
    gender: "female",
    orientation: "men",
    birthday: "1998-06-03",
    country: "HR",
    bio: "Liebt Kuestenstaedte, zeichnet gern und trinkt Matcha.",
    photoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80",
    interests: ["Kunst", "Natur", "Wellness"],
    verified: false,
  },
  {
    email: "elif.eu@example.com",
    displayName: "Elif",
    gender: "female",
    orientation: "men",
    birthday: "1996-03-14",
    country: "BG",
    bio: "Mag Theater, laeuft am Kanal und liebt frische Pasta.",
    photoUrl:
      "https://images.unsplash.com/photo-1521577352947-9bb58764b69a?auto=format&fit=crop&w=800&q=80",
    interests: ["Kunst", "Sport", "Kulinarik"],
    verified: false,
  },
  {
    email: "lukas.eu@example.com",
    displayName: "Lukas",
    gender: "male",
    orientation: "women",
    birthday: "1993-07-21",
    country: "DE",
    bio: "Outdoor-Fan, klettert gern und kocht gern fuer Freunde.",
    photoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80",
    interests: ["Sport", "Natur", "Kochen"],
    verified: true,
  },
];

const adminHeaders = () => ({
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
});

const listUsers = async (page = 1, perPage = 200) => {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
    { headers: adminHeaders() }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Auth list failed (${response.status}): ${body}`);
  }
  return response.json();
};

const findUserByEmail = async (email) => {
  const normalized = email.toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const payload = await listUsers(page, perPage);
    const users = payload.users ?? [];
    const match = users.find((user) => user?.email?.toLowerCase() === normalized);
    if (match) return match;
    if (users.length < perPage) break;
  }
  return null;
};

const ensureAuthUser = async (user) => {
  const email = user.email.toLowerCase();
  if (DRY_RUN) {
    return { id: null, status: "dry-run" };
  }
  const { data: created, error: createError } = await client.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      display_name: user.displayName,
    },
  });
  if (!createError && created?.user?.id) {
    return { id: created.user.id, status: "created" };
  }
  const errorMessage = String(createError?.message ?? "");
  const duplicate =
    errorMessage.toLowerCase().includes("already") ||
    errorMessage.toLowerCase().includes("exists") ||
    errorMessage.toLowerCase().includes("duplicate");
  if (!duplicate) {
    throw createError ?? new Error(`Failed to create user ${email}`);
  }

  const existing = await findUserByEmail(email);
  if (!existing?.id || existing.email?.toLowerCase() !== email) {
    throw new Error(`User exists but could not be found for ${email}`);
  }
  const metadata = {
    ...(existing.user_metadata ?? {}),
    display_name: user.displayName,
  };
  const { error: updateError } = await client.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (updateError) {
    throw updateError;
  }
  return { id: existing.id, status: "updated" };
};

const upsertProfile = async (userId, user) => {
  if (!userId) return;
  const coords = COORDS_BY_COUNTRY[user.country] ?? COORDS_BY_COUNTRY.DE;
  const verifiedAt = new Date().toISOString();
  const profilePayload = {
    id: userId,
    user_id: userId,
    display_name: user.displayName,
    bio: user.bio,
    gender: user.gender,
    orientation: user.orientation,
    intention: "serious",
    interests: user.interests,
    photos: user.photoUrl ? [{ url: user.photoUrl }] : [],
    country: user.country,
    region_code: "EUROPE",
    birthday: user.birthday,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    verified: true,
    verified_at: verifiedAt,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (error) {
    throw error;
  }
};

const main = async () => {
  console.log(`Target: ${new URL(SUPABASE_URL).hostname}`);
  console.log(`Seeding ${USERS.length} users (dry-run: ${DRY_RUN})...`);

  let created = 0;
  let updated = 0;

  for (const user of USERS) {
    const result = await ensureAuthUser(user);
    if (result.status === "created") created += 1;
    if (result.status === "updated") updated += 1;
    await upsertProfile(result.id, user);
    console.log(`✓ ${user.email} (${result.status})`);
  }

  console.log(`Done. created=${created} updated=${updated}`);
  console.log(`Password for all users: ${PASSWORD}`);
};

main().catch((err) => {
  console.error("Seeding failed:", err?.message ?? err);
  process.exit(1);
});
