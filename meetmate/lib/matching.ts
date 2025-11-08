import { differenceInHours } from "date-fns";
import { Profile } from "../types";
import { DiscoveryCandidate } from "../features/discovery/types";
import { getSupabase } from "./supabase";
import { FeatureFlagMap, fetchFeatureFlags } from "./featureFlags";

const EMBEDDING_DISTANCE_WEIGHT = 0.55;
const CLASSIC_WEIGHT = 1 - EMBEDDING_DISTANCE_WEIGHT;
const EMBEDDING_THRESHOLD = 0.2;

const DEFAULT_RADIUS_KM = 50;
const MAX_RECENCY_HOURS = 72;

export const WEIGHTS = {
  distance: 0.35,
  recency: 0.25,
  interests: 0.25,
  feedback: 0.15,
} as const;

export const normalizeDistance = (
  distanceKm: number | undefined,
  radiusKm = DEFAULT_RADIUS_KM,
): number => {
  if (distanceKm === undefined || Number.isNaN(distanceKm)) {
    return 0.5;
  }
  const clamped = Math.min(Math.max(distanceKm, 0), radiusKm);
  return 1 - clamped / radiusKm;
};

export const normalizeRecency = (lastActiveAt?: string | null): number => {
  if (!lastActiveAt) {
    return 0.4;
  }
  const hours = differenceInHours(new Date(), new Date(lastActiveAt));
  if (!Number.isFinite(hours) || hours < 0) {
    return 0.6;
  }
  if (hours >= MAX_RECENCY_HOURS) {
    return 0;
  }
  return 1 - hours / MAX_RECENCY_HOURS;
};

export const normalizeInterestOverlap = (
  viewerInterests: string[],
  candidateInterests: string[],
): number => {
  if (!viewerInterests.length || !candidateInterests.length) {
    return 0;
  }
  const set = new Set(viewerInterests.map((interest) => interest.toLowerCase()));
  const overlap = candidateInterests.filter((interest) =>
    set.has(interest.toLowerCase()),
  );
  const maxSize = Math.max(viewerInterests.length, candidateInterests.length);
  return overlap.length / maxSize;
};

export const normalizeFeedback = (score?: number | null): number => {
  if (score === undefined || score === null) {
    return 0.5;
  }
  if (score > 1) {
    return 1;
  }
  if (score < -1) {
    return 0;
  }
  return (score + 1) / 2; // maps [-1,1] to [0,1]
};

export const computeCandidateScore = (
  candidate: DiscoveryCandidate,
  viewer: Profile,
): number => {
  const distanceScore = normalizeDistance(candidate.distanceKm, DEFAULT_RADIUS_KM);
  const recencyScore = normalizeRecency(candidate.lastActiveAt);
  const interestScore = normalizeInterestOverlap(viewer.interests, candidate.interests);
  const feedbackScore = normalizeFeedback(candidate.feedbackScore);

  return (
    distanceScore * WEIGHTS.distance +
    recencyScore * WEIGHTS.recency +
    interestScore * WEIGHTS.interests +
    feedbackScore * WEIGHTS.feedback
  );
};

export const rankCandidatesClassic = (
  candidates: DiscoveryCandidate[],
  viewerProfile: Profile,
): DiscoveryCandidate[] =>
  candidates
    .map((candidate) => ({
      candidate,
      score: computeCandidateScore(candidate, viewerProfile),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);

export const rankCandidatesVector = async (
  viewerProfile: Profile,
  candidates: DiscoveryCandidate[],
  fallback: (items: DiscoveryCandidate[], viewer: Profile) => DiscoveryCandidate[],
): Promise<DiscoveryCandidate[]> => {
  const flags: FeatureFlagMap = await fetchFeatureFlags();
  if (!flags.paywall_rollout) {
    return fallback(candidates, viewerProfile);
  }

  try {
    const supabase = getSupabase();
    const { data: viewerEmbedding, error: viewerError } = await supabase
      .from("profile_embeddings")
      .select("vector")
      .eq("profile_id", viewerProfile.id)
      .maybeSingle<{ vector: number[] }>();
    if (viewerError || !viewerEmbedding?.vector) {
      return fallback(candidates, viewerProfile);
    }

    const { data: rows, error } = await supabase.rpc("match_candidates_by_vector", {
      viewer_profile_id: viewerProfile.id,
      limit_count: candidates.length,
    });
    if (error || !rows?.length) {
      return fallback(candidates, viewerProfile);
    }

    const scoreMap = new Map<string, number>();
    for (const row of rows as Array<{ candidate_id: string; similarity: number }>) {
      scoreMap.set(row.candidate_id, row.similarity);
    }

    const merged = candidates
      .map((candidate) => {
        const vectorScore = scoreMap.get(candidate.id);
        const normalizedVector = vectorScore !== undefined ? Math.max(vectorScore, 0) : 0;
        const classicScore = computeCandidateScore(candidate, viewerProfile);
        const blended =
          classicScore * CLASSIC_WEIGHT + normalizedVector * EMBEDDING_DISTANCE_WEIGHT;
        const finalScore =
          normalizedVector >= EMBEDDING_THRESHOLD ? blended : classicScore;
        return { candidate, score: finalScore };
      })
      .sort((a, b) => b.score - a.score)
      .map((item) => item.candidate);
    return merged;
  } catch (error) {
    console.warn("rankCandidatesVector failed, falling back", error);
    return fallback(candidates, viewerProfile);
  }
};
