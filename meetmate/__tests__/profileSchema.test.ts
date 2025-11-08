import { profileFormSchema } from "../features/profile/schema";
import { COUNTRY_CODES } from "../features/profile/constants";

const basePayload = {
  displayName: "Test User",
  bio: "Hello world",
  birthdate: "1995-01-01",
  gender: "female",
  orientation: "everyone",
  interests: ["Reisen"],
  photos: [{ path: "photo.jpg", url: "https://example.com/photo.jpg" }],
  location: { latitude: 40, longitude: 10 },
  country: COUNTRY_CODES[0],
} as const;

describe("profileFormSchema country validation", () => {
  it("accepts supported country codes", () => {
    const parsed = profileFormSchema.parse(basePayload);
    expect(parsed.country).toBe(COUNTRY_CODES[0]);
  });

  it("rejects unsupported country codes", () => {
    expect(() =>
      profileFormSchema.parse({
        ...basePayload,
        country: "US",
      }),
    ).toThrow("profile.errors.countryRequired");
  });
});
