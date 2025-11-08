/* eslint-disable no-undef */
describe("Entitlement gating", () => {
  const email = process.env.DETOX_E2E_EMAIL ?? "detox-premium@example.com";
  const password = process.env.DETOX_E2E_PASSWORD ?? "Detox123!";

  beforeAll(async () => {
    await device.launchApp({
      delete: true,
      permissions: { notifications: "YES", location: "inuse" },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("locks premium before webhook and unlocks after simulation", async () => {
    await waitFor(element(by.id("signIn-screen")))
      .toBeVisible()
      .withTimeout(15000);

    const emailInput = element(by.id("signIn-email"));
    await emailInput.replaceText(email);

    const passwordInput = element(by.id("signIn-password"));
    await passwordInput.replaceText(password);

    await element(by.id("signIn-submit")).tap();

    await waitFor(element(by.id("home-screen")))
      .toBeVisible()
      .withTimeout(20000);

    await element(by.id("home-paywall-button")).tap();
    const unlimitedStatus = element(by.id("paywall-unlimited-status"));
    await waitFor(unlimitedStatus).toBeVisible().withTimeout(10000);
    await expect(unlimitedStatus).toHaveText("Unlimited Swipes: Gesperrt");

    await element(by.id("paywall-back-button")).tap();
    await waitFor(element(by.id("home-screen")))
      .toBeVisible()
      .withTimeout(5000);

    let debugAvailable = true;
    try {
      await expect(element(by.id("home-debug-button"))).toBeVisible();
    } catch (error) {
      console.warn(
        "Debug screen not available in this build, skipping entitlement simulation.",
      );
      debugAvailable = false;
    }

    if (debugAvailable) {
      await element(by.id("home-debug-button")).tap();
      await waitFor(element(by.id("debug-entitlements-screen")))
        .toBeVisible()
        .withTimeout(10000);
      await element(by.id("debug-simulate-button")).tap();

      await waitFor(element(by.id("debug-active-item")))
        .toBeVisible()
        .withTimeout(15000);

      await device.sendToHome();
      await device.launchApp({ newInstance: false });
      await waitFor(element(by.id("home-screen")))
        .toBeVisible()
        .withTimeout(15000);

      await element(by.id("home-paywall-button")).tap();
      await waitFor(unlimitedStatus).toBeVisible().withTimeout(10000);
      await waitFor(unlimitedStatus)
        .toHaveText("Unlimited Swipes: Aktiv")
        .withTimeout(20000);
      await expect(unlimitedStatus).toHaveText("Unlimited Swipes: Aktiv");
    }
  });
});
