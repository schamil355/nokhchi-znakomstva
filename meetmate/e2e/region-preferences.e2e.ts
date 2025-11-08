/* eslint-disable no-undef */
import { createClient } from "@supabase/supabase-js";

describe("Regional discovery gating", () => {
  const cheEmail = process.env.DETOX_CHECHNYA_EMAIL ?? "chechnya.tester@example.com";
  const euEmail = process.env.DETOX_EUROPE_EMAIL ?? "europe.tester@example.com";
  const password =
    process.env.DETOX_SEED_PASSWORD ?? process.env.SEED_USER_PASSWORD ?? "Password123!";

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey =
    process.env.DETOX_SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "";
  const adminClient =
    supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

  const signIn = async (email: string) => {
    await waitFor(element(by.id("signIn-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("signIn-email")).replaceText(email);
    await element(by.id("signIn-password")).replaceText(password);
    await element(by.id("signIn-submit")).tap();
  };

  beforeAll(async () => {
    await device.launchApp({
      delete: true,
      permissions: { location: "always" },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterEach(async () => {
    try {
      await element(by.id("tabs-profile"));
    } catch (error) {
      // ignore missing tab id
    }
  });

  const expectChechnyaDeck = async () => {
    await waitFor(element(by.id("discovery-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await waitFor(element(by.id("discovery-active-card")))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.text("Gudermes Guide"))).toBeVisible();
    await element(by.id("discovery-active-card")).swipe("left", "fast", 0.9);
    await waitFor(element(by.text("No new suggestions")))
      .toBeVisible()
      .withTimeout(8000);
    await expect(
      element(
        by.text(
          "No more profiles in Chechnya right now. Switch the region to broaden your matches.",
        ),
      ),
    ).toBeVisible();
    await expect(element(by.text("Paris Voyager"))).not.toExist();
  };

  const updateSearchPreference = async (
    email: string,
    region: "CHECHNYA" | "EUROPE" | "RUSSIA",
  ) => {
    if (!adminClient) {
      throw new Error("Supabase admin credentials missing for Detox test");
    }
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersError) {
      throw usersError;
    }
    const userId = users?.users?.find((user) => user.email === email)?.id;
    if (!userId) {
      throw new Error(`Unable to locate user ${email}`);
    }
    const { error } = await adminClient
      .from("search_prefs")
      .upsert({ user_id: userId, region_mode: region }, { onConflict: "user_id" });
    if (error) {
      throw error;
    }
  };

  it("switches from Chechnya-only to European discovery", async () => {
    await signIn(cheEmail);
    await expectChechnyaDeck();

    await updateSearchPreference(cheEmail, "EUROPE");

    await device.launchApp({
      newInstance: false,
      url: "meetmate://preferences/search-region",
    });
    await waitFor(element(by.id("prefs-region-option-europe")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id("prefs-region-option-europe")).tap();
    await element(by.id("prefs-region-save")).tap();

    await waitFor(element(by.id("discovery-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await waitFor(element(by.id("discovery-active-card")))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.text("Paris Voyager"))).toBeVisible();
    await expect(element(by.text("Gudermes Guide"))).not.toExist();
  });
});
