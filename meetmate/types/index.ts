export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type Gender = "female" | "male";
export type Orientation = "women" | "men" | "everyone";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type ProfilePhoto = {
  path: string;
  url: string;
};

export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  birthdate: string;
  gender: Gender;
  orientation: Orientation;
  interests: string[];
  photos: ProfilePhoto[];
  location?: Coordinates | null;
  country?: string | null;
  verifiedAt?: string | null;
  verifiedBadge?: string | null;
  verifiedScore?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt?: string;
};

export type Match = {
  id: string;
  participants: string[];
  createdAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
};
