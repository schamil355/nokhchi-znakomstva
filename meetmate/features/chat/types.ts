export type ChatMessage = {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  readAt?: string | null;
  optimistic?: boolean;
};

export type ChatMatch = {
  id: string;
  userA: string;
  userB: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  otherUserProfile?: {
    id: string;
    displayName: string;
    photos: { path: string; url: string }[];
  };
  unreadCount?: number;
};
