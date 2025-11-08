import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type DemoProfile = {
  email: string;
  password: string;
  displayName: string;
  bio: string;
  gender: "female" | "male" | "nonbinary";
  orientation: "women" | "men" | "everyone";
  interests: string[];
  country: "RU" | "FR" | "DE" | "AT" | "NO" | "BE";
  location: { latitude: number; longitude: number };
  searchPreference?: "CHECHNYA" | "EUROPE" | "RUSSIA";
  photoUrl: string;
};

const demoProfiles: DemoProfile[] = [
  {
    email: "chechnya.tester@example.com",
    password: process.env.SEED_USER_PASSWORD ?? "Password123!",
    displayName: "Chechnya Tester",
    bio: "Tester aus Grosny – fokussiert auf lokale Matches.",
    gender: "female",
    orientation: "everyone",
    interests: ["Reisen", "Natur", "Fotografie", "Musik"],
    country: "RU",
    location: { latitude: 43.317, longitude: 45.694 },
    searchPreference: "CHECHNYA",
    photoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"
  },
  {
    email: "chechnya.local@example.com",
    password: process.env.SEED_USER_PASSWORD ?? "Password123!",
    displayName: "Gudermes Guide",
    bio: "Aus Gudermes – liebt lokale Kultur und Küche.",
    gender: "male",
    orientation: "women",
    interests: ["Kochen", "Natur", "Sport", "Lesen"],
    country: "RU",
    location: { latitude: 43.351, longitude: 46.103 },
    photoUrl: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39"
  },
  {
    email: "paris.vibes@example.com",
    password: process.env.SEED_USER_PASSWORD ?? "Password123!",
    displayName: "Paris Voyager",
    bio: "Kunst & Cafés in Paris – immer auf der Suche nach neuen Eindrücken.",
    gender: "female",
    orientation: "everyone",
    interests: ["Kunst", "Musik", "Reisen", "Tanzen"],
    country: "FR",
    location: { latitude: 48.8566, longitude: 2.3522 },
    photoUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518"
  },
  {
    email: "europe.tester@example.com",
    password: process.env.SEED_USER_PASSWORD ?? "Password123!",
    displayName: "Berlin Explorer",
    bio: "Test-Account für EU-Region mit Fokus auf Berlin.",
    gender: "male",
    orientation: "everyone",
    interests: ["Gaming", "Musik", "Sport", "Reisen"],
    country: "DE",
    location: { latitude: 52.52, longitude: 13.405 },
    searchPreference: "EUROPE",
    photoUrl: "https://images.unsplash.com/photo-1529665253569-6d01c0eaf7b6"
  },
  {
    email: "vienna.vibes@example.com",
    password: process.env.SEED_USER_PASSWORD ?? "Password123!",
    displayName: "Vienna Creative",
    bio: "Designer in Wien – liebt Kaffeehäuser und Klassik.",
    gender: "nonbinary",
    orientation: "everyone",
    interests: ["Kunst", "Reisen", "Fotografie", "Musik"],
    country: "AT",
    location: { latitude: 48.2082, longitude: 16.3738 },
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
  },
  {
    email: "oslo.adventurer@example.com",
    password: process.env.SEED_USER_PASSWORD ?? "Password123!",
    displayName: "Oslo Adventurer",
    bio: "Outdoor-Fan aus Oslo – immer bereit für ein neues Fjord-Abenteuer.",
    gender: "male",
    orientation: "women",
    interests: ["Natur", "Sport", "Reisen", "Fotografie"],
    country: "NO",
    location: { latitude: 59.9139, longitude: 10.7522 },
    photoUrl: "https://images.unsplash.com/photo-1506790409786-287062b21cfe"
  }
  {
    email: "moscow.insider@example.com",
    password: process.env.SEED_USER_PASSWORD ?? "Password123!",
    displayName: "Moscow Insider",
    bio: "Tech-Recruiterin aus Moskau, liebt Third-Wave-Cafés und Indie-Filme.",
    gender: "female",
    orientation: "everyone",
    interests: ["Technologie", "Reisen", "Musik", "Lesen"],
    country: "RU",
    location: { latitude: 55.7558, longitude: 37.6173 },
    searchPreference: "RUSSIA",
    photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
  }
];

const ensureUser = async (profile: DemoProfile) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email: profile.email,
    password: profile.password,
    email_confirm: true
  });

  if (error) {
    if (error.message?.includes("registered")) {
      const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
      const user = existing.data?.users?.find((u) => u.email === profile.email);
      if (user?.id) {
        return user.id;
      }
    }
    throw error;
  }

  if (!data.user) {
    throw new Error(`Failed to create user for ${profile.email}`);
  }

  return data.user.id;
};

const ensurePhotoObject = async (path: string, url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const { error } = await supabase.storage.from("photos").upload(path, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: true
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn(`Could not upload photo for ${path}:`, error);
  }
};

const upsertProfile = async (userId: string, profile: DemoProfile) => {
  const storagePath = `seed/${userId}.jpg`;
  await ensurePhotoObject(storagePath, profile.photoUrl);

  const birthdate = "1992-06-15";
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    user_id: userId,
    display_name: profile.displayName,
    bio: profile.bio,
    birthdate,
    gender: profile.gender,
    orientation: profile.orientation,
    interests: profile.interests,
    photos: [{ path: storagePath }],
    location: `SRID=4326;POINT(${profile.location.longitude} ${profile.location.latitude})`,
    country: profile.country
  });

  if (error) {
    throw error;
  }
};

const upsertSearchPreference = async (userId: string, regionMode: "CHECHNYA" | "EUROPE" | "RUSSIA") => {
  const { error } = await supabase
    .from("search_prefs")
    .upsert({ user_id: userId, region_mode: regionMode }, { onConflict: "user_id" });
  if (error) {
    throw error;
  }
};

const seed = async () => {
  console.log("Seeding demo profiles...");
  for (const profile of demoProfiles) {
    const userId = await ensureUser(profile);
    await upsertProfile(userId, profile);
    if (profile.searchPreference) {
      await upsertSearchPreference(userId, profile.searchPreference);
    }
  }

  console.log("Creating example likes/messages for demo context...");
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (usersError) {
    throw usersError;
  }

  const demoUserIds = demoProfiles
    .map((profile) => usersData?.users?.find((user) => user.email === profile.email)?.id)
    .filter((id): id is string => Boolean(id));

  if (demoUserIds.length >= 2) {
    const [first, second] = demoUserIds;
    await supabase.from("likes").upsert({ liker: first, liked: second }, { onConflict: "liker,liked" });
    await supabase.from("likes").upsert({ liker: second, liked: first }, { onConflict: "liker,liked" });
  }

  console.log("Seed complete.");
};

seed()
  .then(() => {
    console.log("Seeding finished.");
  })
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  });
