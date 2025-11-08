import { differenceInYears } from "date-fns";
import { Like, Profile } from "../types";

export const shouldCreateMatch = (likeA: Like, likeB: Like): boolean => {
  return likeA.likerId === likeB.likedId && likeA.likedId === likeB.likerId;
};

export const calculateCompatibilityScore = (profileA: Profile, profileB: Profile): number => {
  const ageA = differenceInYears(new Date(), new Date(profileA.birthday));
  const ageB = differenceInYears(new Date(), new Date(profileB.birthday));
  const ageDelta = Math.abs(ageA - ageB);
  const sharedInterests = profileA.interests.filter((interest) => profileB.interests.includes(interest));
  const intentionMatch = profileA.intention === profileB.intention;

  let score = 50;
  score -= ageDelta * 1.5;
  score += sharedInterests.length * 10;
  if (intentionMatch) {
    score += 15;
  }

  if (profileA.isPremium || profileB.isPremium) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
};

export const isProfileEligible = (candidate: Profile, filters: { genders: Profile["gender"][]; ageRange: [number, number] }) => {
  const age = differenceInYears(new Date(), new Date(candidate.birthday));
  const [minAge, maxAge] = filters.ageRange;
  return filters.genders.includes(candidate.gender) && age >= minAge && age <= maxAge;
};
