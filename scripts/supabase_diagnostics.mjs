import "dotenv/config";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.env.SUPABASE_DIAG_DRY_RUN === "1";

const resolveEnv = (name, value) => {
  if (!value && !DRY_RUN) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
};

const SUPABASE_URL = resolveEnv(
  "EXPO_PUBLIC_SUPABASE_URL",
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
);
const SUPABASE_ANON_KEY = resolveEnv(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
);
const SUPABASE_SERVICE_ROLE_KEY = resolveEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const EMAIL = resolveEnv("SUPABASE_DIAG_EMAIL", process.env.SUPABASE_DIAG_EMAIL);
const PASSWORD = resolveEnv("SUPABASE_DIAG_PASSWORD", process.env.SUPABASE_DIAG_PASSWORD);
const DISPLAY_NAME = process.env.SUPABASE_DIAG_DISPLAY_NAME ?? "Diagnostics Runner";
const CLEANUP = process.env.SUPABASE_DIAG_CLEANUP === "1";

const supabase = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          "X-Diagnostics": "supabase"
        }
      }
    });

const adminClient = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

const logSection = (title) => {
  console.log(`\n=== ${title} ===`);
};

const adminHeaders = () => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
});

const ensureHealth = async () => {
  logSection("Auth health check");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: SUPABASE_ANON_KEY }
  });
  console.log("Status:", response.status);
  console.log("Body:", await response.text());
};

const trySignIn = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) {
    return { session: null, error };
  }
  return { session: data.session ?? null, error: null };
};

const fetchDiagnosticsUser = async () => {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(EMAIL)}`,
    {
      headers: adminHeaders()
    }
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to query diagnostics user: ${response.status} ${body}`);
  }
  const payload = await response.json();
  return payload.users?.[0] ?? null;
};

const ensureDiagnosticsUser = async () => {
  if (DRY_RUN || !adminClient) {
    return null;
  }

  const existing = await fetchDiagnosticsUser();
  if (!existing) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: DISPLAY_NAME }
    });
    if (error) {
      throw error;
    }
    console.log("Diagnostics user created:", data.user?.id ?? "unknown-id");
    return data.user;
  }

  const metadata = {
    ...(existing.user_metadata ?? {}),
    display_name: DISPLAY_NAME
  };

  const { data, error } = await adminClient.auth.admin.updateUserById(existing.id, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: metadata
  });
  if (error) {
    throw error;
  }
  console.log("Diagnostics user ensured:", existing.id);
  return data.user ?? existing;
};

const ensureSession = async () => {
  if (!DRY_RUN) {
    logSection("Diagnostics user provisioning");
    await ensureDiagnosticsUser();
  }

  logSection("Sign-in");
  const signInResult = await trySignIn();
  if (signInResult.error) {
    throw signInResult.error;
  }
  if (!signInResult.session) {
    throw new Error("Sign-in returned no session despite successful response.");
  }
  console.log("Successfully signed in as", EMAIL);
  return signInResult.session;
};

const performCrud = async (session) => {
  logSection("Profiles CRUD");
  const userId = session.user.id;
  const profilePayload = {
    user_id: userId,
    display_name: DISPLAY_NAME,
    birthday: "1995-05-05",
    bio: "Diagnostics run at " + new Date().toISOString(),
    gender: "female",
    intention: "serious",
    interests: ["diagnostics", "supabase"],
    photos: [
      {
        id: crypto.randomUUID(),
        url: "https://placekitten.com/400/400",
        createdAt: new Date().toISOString()
      }
    ],
    show_distance: true,
    show_last_seen: true,
    updated_at: new Date().toISOString()
  };

  const upsert = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "user_id" })
    .select("id, user_id, display_name, gender, intention")
    .single();

  if (upsert.error) {
    if (upsert.error.code === "PGRST205") {
      throw new Error(
        "Supabase schema missing table 'public.profiles'. Run supabase db reset / push to apply migrations."
      );
    }
    throw upsert.error;
  }
  console.log("Upserted profile:", upsert.data);

  const fetched = await supabase
    .from("profiles")
    .select("id, user_id, display_name, gender, intention, interests")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetched.error) {
    throw fetched.error;
  }
  console.log("Fetched profile:", fetched.data);

  if (CLEANUP) {
    const { error: deleteError } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (deleteError) {
      throw deleteError;
    }
    console.log("Cleanup enabled -> profile row deleted again.");
  }
};

const main = async () => {
  logSection("Environment");
  console.log("Supabase URL:", SUPABASE_URL);
  console.log("Diagnostics user:", EMAIL);
  if (DRY_RUN) {
    console.log("SUPABASE_DIAG_DRY_RUN=1 -> stopping before hitting Supabase.");
    return;
  }

  await ensureHealth();
  const session = await ensureSession();
  if (!session) {
    console.warn("Cannot continue without an authenticated session.");
    return;
  }
  await performCrud(session);
};

main().catch((error) => {
  console.error("Diagnostics failed", error);
  process.exitCode = 1;
});
