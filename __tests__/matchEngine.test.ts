import { calculateCompatibilityScore, isProfileEligible, shouldCreateMatch } from "../src/lib/matchEngine";
import { Like, Profile } from "../src/types";

const createProfile = (overrides: Partial<Profile>): Profile => ({
  id: "1",
  userId: "1",
  displayName: "Test",
  birthday: "1995-05-10",
  bio: "Hi",
  gender: "female",
  intention: "serious",
  interests: ["reisen", "sport"],
  photos: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPremium: false,
  ...overrides
});

describe("matchEngine", () => {
  test("should detect reciprocal likes", () => {
    const likeA: Like = {
      id: "likeA",
      likerId: "user1",
      likedId: "user2",
      createdAt: new Date().toISOString()
    };

    const likeB: Like = {
      id: "likeB",
      likerId: "user2",
      likedId: "user1",
      createdAt: new Date().toISOString()
    };

    expect(shouldCreateMatch(likeA, likeB)).toBe(true);
  });

  test("calculates compatibility score with shared interests", () => {
    const a = createProfile({ interests: ["reisen", "kochen"], birthday: "1993-01-01" });
    const b = createProfile({ userId: "2", interests: ["reisen", "musik"], birthday: "1994-01-01" });
    const score = calculateCompatibilityScore(a, b);
    expect(score).toBeGreaterThan(60);
  });

  test("filters profile by gender and age", () => {
    const profile = createProfile({ gender: "female", birthday: "2000-01-01" });
    const eligible = isProfileEligible(profile, { genders: ["female"], ageRange: [20, 30] });
    expect(eligible).toBe(true);
    const notEligible = isProfileEligible(profile, { genders: ["male"], ageRange: [20, 30] });
    expect(notEligible).toBe(false);
  });
});
