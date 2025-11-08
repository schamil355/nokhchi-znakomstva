import { computeCandidateScore } from "../../lib/matching";
import type { DiscoveryCandidate } from "../../features/discovery/types";
import type { Profile } from "../../types";

describe("computeCandidateScore", () => {
  const viewer: Profile = {
    id: "viewer",
    userId: "viewer",
    displayName: "Viewer",
    bio: "",
    birthdate: "1995-01-01",
    gender: "female",
    orientation: "men",
    interests: ["sport", "reisen", "musik"],
    photos: [],
    location: { latitude: 52.5, longitude: 13.4 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseCandidate: DiscoveryCandidate = {
    id: "candidate",
    displayName: "Candidate",
    bio: "",
    gender: "male",
    orientation: "women",
    birthdate: "1994-01-01",
    interests: ["reisen", "musik"],
    photos: [],
    distanceKm: 3,
    lastActiveAt: new Date().toISOString(),
    feedbackScore: 0.6,
  };

  it("awards higher scores to close and engaged candidates", () => {
    const nearby = computeCandidateScore(baseCandidate, viewer);
    const distant = computeCandidateScore({ ...baseCandidate, distanceKm: 40 }, viewer);
    expect(nearby).toBeGreaterThan(distant);
  });

  it("boosts candidates with strong interest overlap and positive feedback", () => {
    const overlap = computeCandidateScore(
      { ...baseCandidate, feedbackScore: 0.9 },
      viewer,
    );
    const noOverlap = computeCandidateScore(
      { ...baseCandidate, interests: ["lesen"], feedbackScore: -0.2 },
      viewer,
    );
    expect(overlap).toBeGreaterThan(noOverlap);
  });

  it("penalises inactive candidates", () => {
    const active = computeCandidateScore(baseCandidate, viewer);
    const stale = computeCandidateScore(
      {
        ...baseCandidate,
        lastActiveAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      viewer,
    );
    expect(active).toBeGreaterThan(stale);
  });
});
