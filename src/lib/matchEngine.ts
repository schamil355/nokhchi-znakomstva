import { Like, Profile, RELATIONSHIP_COMPASS_KEYS, RelationshipCompassKey } from "../types";
import { GeoRegion } from "../state/preferencesStore";
import { resolveGeoRegion, haversineDistance } from "./geo";

const calculateAge = (value: string | Date) => {
  const birthday = value instanceof Date ? value : new Date(value);
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDelta = today.getMonth() - birthday.getMonth();
  const dayDelta = today.getDate() - birthday.getDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }
  return age;
};


export const shouldCreateMatch = (likeA: Like, likeB: Like): boolean => {
  return likeA.likerId === likeB.likedId && likeA.likedId === likeB.likerId;
};

export const calculateCompatibilityScore = (profileA: Profile, profileB: Profile): number => {
  const ageA = calculateAge(profileA.birthday);
  const ageB = calculateAge(profileB.birthday);
  const ageDelta = Math.abs(ageA - ageB);
  const sharedInterests = profileA.interests.filter((interest) => profileB.interests.includes(interest));
  const intentionMatch = profileA.intention === profileB.intention;
  const compassAlignment = calculateCompassAlignment(profileA, profileB);

  let score = 50;
  score -= ageDelta * 1.5;
  score += sharedInterests.length * 10;
  if (intentionMatch) {
    score += 15;
  }
  if (compassAlignment.total > 0) {
    score += compassAlignment.matches * 5;
  }

  if (profileA.isPremium || profileB.isPremium) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
};

const resolveRegion = (candidate: Profile): GeoRegion => {
  return resolveGeoRegion({
    countryName: candidate.country,
    countryCode: candidate.country,
    regionCode: candidate.regionCode,
    latitude: candidate.latitude,
    longitude: candidate.longitude
  });
};

type EligibilityFilters = {
  genders: Profile["gender"][];
  ageRange: [number, number];
  region: GeoRegion;
  distanceRange?: [number, number];
  origin?: { latitude?: number | null; longitude?: number | null };
};

export const isProfileEligible = (candidate: Profile, filters: EligibilityFilters) => {
  // Allow profiles ohne Geburtsdatum durch den Filter zu kommen
  const hasBirthday = !!candidate.birthday;
  const age = hasBirthday ? calculateAge(candidate.birthday) : null;
  const [minAge, maxAge] = filters.ageRange;
  const ageMatches = !hasBirthday || (age !== null && age >= minAge && age <= maxAge);
  const matchesBasic = filters.genders.includes(candidate.gender) && ageMatches;
  if (!matchesBasic) {
    return false;
  }
  const isVerified = Boolean(candidate.verified) || Boolean(candidate.verifiedAt);
  if (!isVerified) {
    return false;
  }
  if (filters.distanceRange && filters.origin) {
    const [minDistance, maxDistance] = filters.distanceRange;
    const { latitude: originLat, longitude: originLng } = filters.origin;
    if (
      typeof originLat === "number" &&
      typeof originLng === "number" &&
      typeof candidate.latitude === "number" &&
      typeof candidate.longitude === "number"
    ) {
      const distance = haversineDistance(candidate.latitude, candidate.longitude, originLat, originLng);
      if (distance < minDistance || distance > maxDistance) {
        return false;
      }
    }
  }
  const candidateRegion = resolveRegion(candidate);
  // Wenn wir keine Standort-/Länderinfos haben, Region nicht hart blocken
  const hasLocationInfo = !!candidate.country || typeof candidate.latitude === "number" || typeof candidate.longitude === "number";
  if (!hasLocationInfo) {
    return true;
  }
  return candidateRegion === filters.region;
};

export const calculateCompassAlignment = (profileA: Profile, profileB: Profile) => {
  const answersA = profileA.relationshipCompass ?? {};
  const answersB = profileB.relationshipCompass ?? {};
  let matches = 0;
  let total = 0;
  const matchedKeys: RelationshipCompassKey[] = [];

  for (const key of RELATIONSHIP_COMPASS_KEYS) {
    const valueA = answersA[key];
    const valueB = answersB[key];
    if (!valueA || !valueB) {
      continue;
    }
    total += 1;
    if (valueA === valueB) {
      matches += 1;
      matchedKeys.push(key);
    }
  }

  const score = total > 0 ? Math.round((matches / total) * 100) : null;
  return { matches, total, score, matchedKeys };
};
