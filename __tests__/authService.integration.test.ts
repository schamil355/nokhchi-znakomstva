import { signInWithPassword, signOut } from "../src/services/authService";
import { upsertProfile, fetchProfile, type ProfileInput } from "../src/services/profileService";

jest.setTimeout(60_000);

const email = process.env.SUPABASE_DIAG_EMAIL;
const password = process.env.SUPABASE_DIAG_PASSWORD;

const describeIfCreds = email && password ? describe : describe.skip;

describeIfCreds("Supabase auth + profile integration", () => {
  it("signs in with Supabase and performs profile CRUD", async () => {
    const session = await signInWithPassword(email!, password!);
    expect(session.user.email?.toLowerCase()).toBe(email!.toLowerCase());

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
