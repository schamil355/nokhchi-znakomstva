import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { signInWithPassword, signOut } from "../src/services/authService";
import { upsertProfile, fetchProfile, type ProfileInput } from "../src/services/profileService";

jest.setTimeout(60_000);

dotenv.config({ path: "server/.env" });

const email = process.env.SUPABASE_DIAG_EMAIL;
const password = process.env.SUPABASE_DIAG_PASSWORD;
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfCreds = email && password ? describe : describe.skip;

const ensureDiagnosticsUser = async () => {
  if (!supabaseUrl || !serviceRoleKey || !email || !password) {
    return;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Diagnostics Runner" }
  });
  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    if (!message.includes("already") && !message.includes("exist")) {
      throw error;
    }
  }
};

describeIfCreds("Supabase auth + profile integration", () => {
  it("signs in with Supabase and performs profile CRUD", async () => {
    await ensureDiagnosticsUser();
    const session = await signInWithPassword(email!, password!);
    expect(session.user.email).toBeTruthy();

    const profileInput: ProfileInput = {
      displayName: "Diag Integration",
      birthday: "1995-05-05",
      bio: "Integration test run at " + new Date().toISOString(),
      gender: "female",
      intention: "serious",
      interests: ["diagnostics", "jest"],
      photos: [
        {
          id: `diag-${Date.now()}`,
          url: "https://placekitten.com/420/420",
          createdAt: new Date().toISOString()
        }
      ]
    };

    const updatedProfile = await upsertProfile(session.user.id, profileInput);
    expect(updatedProfile.displayName).toBe(profileInput.displayName);
    expect(updatedProfile.userId).toBe(session.user.id);

    const fetched = await fetchProfile(session.user.id);
    expect(fetched?.displayName).toBe(profileInput.displayName);

    await signOut();
  });
});

if (!email || !password) {
  test.skip("Supabase integration diagnostics (credentials missing)", () => undefined);
}
