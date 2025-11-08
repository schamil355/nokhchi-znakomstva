import {
  computeCandidateScore,
  normalizeDistance,
  normalizeFeedback,
  normalizeInterestOverlap,
  normalizeRecency,
  rankCandidatesClassic,
} from "../lib/matching";
import { DiscoveryCandidate } from "../features/discovery/types";
import { Profile } from "../types";

const viewerProfile: Profile = {
  id: "viewer",
  userId: "viewer",
  displayName: "Viewer",
  bio: "",
  birthdate: "1995-01-01",
  gender: "female",
  orientation: "men",
  interests: ["Reisen", "Kochen", "Sport"],
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
  birthdate: "1993-02-02",
  interests: ["Reisen", "Musik"],
  photos: [],
  distanceKm: 5,
  lastActiveAt: new Date().toISOString(),
  feedbackScore: 0.2,
};

describe("matching normalization helpers", () => {
  test("normalizeDistance returns 1 for zero distance and decreases with distance", () => {
    expect(normalizeDistance(0, 50)).toBeCloseTo(1);
    expect(normalizeDistance(25, 50)).toBeCloseTo(0.5);
    expect(normalizeDistance(100, 50)).toBeCloseTo(0);
  });

  test("normalizeRecency handles missing dates and recent activity", () => {
    expect(normalizeRecency()).toBeGreaterThan(0);
    expect(normalizeRecency(new Date().toISOString())).toBeCloseTo(1);
  });

  test("normalizeInterestOverlap compares shared interests", () => {
    expect(normalizeInterestOverlap(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 2);
    expect(normalizeInterestOverlap([], ["b", "c"])).toBe(0);
  });

  test("normalizeFeedback clamps and maps range", () => {
    expect(normalizeFeedback(1)).toBe(1);
    expect(normalizeFeedback(-1)).toBe(0);
    expect(normalizeFeedback(0)).toBeCloseTo(0.5);
    expect(normalizeFeedback(undefined)).toBeCloseTo(0.5);
  });
});

describe("computeCandidateScore", () => {
  test("higher overlap and closer distance increases score", () => {
    const close = computeCandidateScore(baseCandidate, viewerProfile);
    const farCandidate = { ...baseCandidate, distanceKm: 45, interests: ["Musik"] };
    const farScore = computeCandidateScore(farCandidate, viewerProfile);
    expect(close).toBeGreaterThan(farScore);
  });
});

describe("rankCandidates", () => {
  test("orders candidates by computed score", () => {
    const candidates: DiscoveryCandidate[] = [
      baseCandidate,
      {
        ...baseCandidate,
        id: "2",
        distanceKm: 1,
        interests: ["Reisen", "Sport"],
        feedbackScore: 0.8,
      },
      {
        ...baseCandidate,
        id: "3",
        distanceKm: 30,
        interests: ["Gaming"],
        feedbackScore: -0.2,
      },
    ];

    const ranked = rankCandidatesClassic(candidates, viewerProfile);
    expect(ranked[0].id).toBe("2");
    expect(ranked[ranked.length - 1].id).toBe("3");
  });
});
