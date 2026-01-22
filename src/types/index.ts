export type Gender = "male" | "female";
export type Intention = "serious" | "casual" | "friendship";

export const RELATIONSHIP_COMPASS_KEYS = [
  "timeline",
  "familyCloseness",
  "religiousPractice",
  "relocation",
  "familyIntro",
  "roles",
  "lifestyle"
] as const;

export type RelationshipCompassKey = typeof RELATIONSHIP_COMPASS_KEYS[number];
export type RelationshipTimeline = "fast" | "steady" | "slow" | "no_timeline";
export type FamilyCloseness = "very_close" | "close" | "neutral" | "independent";
export type ReligiousPractice = "practicing" | "occasional" | "cultural" | "not_religious" | "private";
export type Relocation = "stay" | "open_national" | "open_international" | "flexible";
export type FamilyIntro = "early" | "some_months" | "when_sure" | "private";
export type RolesOutlook = "traditional" | "mixed" | "modern" | "depends";
export type LifestyleRhythm = "homebody" | "balanced" | "active" | "career_focus";

export type RelationshipCompass = {
  timeline?: RelationshipTimeline;
  familyCloseness?: FamilyCloseness;
  religiousPractice?: ReligiousPractice;
  relocation?: Relocation;
  familyIntro?: FamilyIntro;
  roles?: RolesOutlook;
  lifestyle?: LifestyleRhythm;
};

export type Photo = {
  id: string;
  url?: string;
  createdAt: string;
  assetId?: number;
  visibilityMode?: "public" | "match_only" | "whitelist" | "blurred_until_match";
};

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  birthday: string;
  bio: string;
  gender: Gender;
  intention: Intention;
  interests: string[];
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
  isPremium: boolean;
  isIncognito?: boolean;
  hideNearby?: boolean;
  hideNearbyRadius?: number | null;
  showDistance?: boolean;
  showLastSeen?: boolean;
  lastActiveAt?: string;
  verified?: boolean;
  verifiedAt?: string;
  primaryPhotoPath?: string | null;
  primaryPhotoId?: number | null;
  verifiedFaceScore?: number | null;
  relationshipCompass?: RelationshipCompass | null;
  country?: string | null;
  regionCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Like = {
  id: string;
  likerId: string;
  likedId: string;
  createdAt: string;
  matchId?: string;
};

export type Match = {
  id: string;
  participants: string[];
  createdAt: string;
  lastMessageAt?: string;
  isActive: boolean;
  previewPhotoUrl?: string | null;
  otherDisplayName?: string | null;
  otherIsIncognito?: boolean;
};

export type Message = {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
};

export type ReportReason = "spam" | "fake" | "abuse" | "other";

export type Report = {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  createdAt: string;
};

export type Block = {
  id: string;
  userId: string;
  blockedUserId: string;
  createdAt: string;
};

export type DirectMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
};

export type DirectConversation = {
  id: string;
  userA: string;
  userB: string;
  createdAt: string;
  lastMessageAt?: string | null;
  otherUserId?: string | null;
  lastMessage?: DirectMessage | null;
  otherProfile?: Profile | null;
  otherProfilePhoto?: string | null;
};
