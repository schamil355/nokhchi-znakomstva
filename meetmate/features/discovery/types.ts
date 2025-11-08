import { Gender, Orientation, ProfilePhoto } from "../../types";

export type DiscoveryPreferences = {
  radiusKm: number;
  maxResults: number;
  interestedIn: Array<Gender>;
};

export const defaultDiscoveryPreferences: DiscoveryPreferences = {
  radiusKm: 25,
  maxResults: 50,
  interestedIn: ["female", "male", "nonbinary", "other"],
};

export type DiscoveryCandidate = {
  id: string;
  displayName: string;
  bio: string;
  gender: Gender;
  orientation: Orientation;
  birthdate: string;
  interests: string[];
  photos: ProfilePhoto[];
  distanceKm?: number;
  lastActiveAt?: string | null;
  feedbackScore?: number | null;
};

export type SwipeAction = "pass" | "like" | "superlike";
