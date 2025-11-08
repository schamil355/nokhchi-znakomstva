/* eslint-disable no-undef */
describe("Onboarding smoke flow", () => {
  const uniqueEmail = `detox+${Date.now()}@example.com`;
  const password = "Detox123!";

  it("registers, completes profile, swipes and hits match modal", async () => {
    await waitFor(element(by.id("signIn-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("signIn-goToSignUp")).tap();

    await waitFor(element(by.id("signUp-screen")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id("signUp-displayName")).replaceText("Detox Tester");
    await element(by.id("signUp-email")).replaceText(uniqueEmail);
    await element(by.id("signUp-password")).replaceText(password);
    await element(by.id("signUp-confirmPassword")).replaceText(password);
    await element(by.id("signUp-submit")).tap();

    // In the test backend we auto-confirm the account and navigate back to sign-in.
    await waitFor(element(by.id("signIn-screen")))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id("signIn-email")).replaceText(uniqueEmail);
    await element(by.id("signIn-password")).replaceText(password);
    await element(by.id("signIn-submit")).tap();

    await waitFor(element(by.id("profile-form")))
      .toBeVisible()
      .withTimeout(15000);
    await element(by.id("profile-form-displayName")).replaceText("Detox Tester");
    await element(by.id("profile-form-birthdate")).replaceText("1995-01-01");
    await element(by.id("profile-form-interest-Reisen")).tap();
    await element(by.id("profile-form-add-dummy-photo")).tap();
    await element(by.id("profile-form-dummy-location")).tap();
    await element(by.id("profile-form-submit")).tap();

    await waitFor(element(by.id("discovery-screen")))
      .toBeVisible()
      .withTimeout(15000);
    await waitFor(element(by.id("discovery-active-card")))
      .toBeVisible()
      .withTimeout(10000);

    // Swipe right (like). Assumes mock backend yields a mutual match for the first candidate.
    await element(by.id("discovery-active-card")).swipe("right", "fast", 0.9);

    await waitFor(element(by.id("discovery-match-content")))
      .toBeVisible()
      .withTimeout(8000);
    await element(by.id("discovery-match-continue")).tap();

    await expect(element(by.id("discovery-screen"))).toBeVisible();
  });
});
