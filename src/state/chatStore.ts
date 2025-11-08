import { create } from "zustand";

type ChatState = {
  typingMatches: Record<string, boolean>;
  setTyping: (matchId: string, value: boolean) => void;
  unreadCounts: Record<string, number>;
  setUnread: (matchId: string, count: number) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  typingMatches: {},
  unreadCounts: {},
  setTyping: (matchId, value) =>
    set((state) => ({
      typingMatches: {
        ...state.typingMatches,
        [matchId]: value
      }
    })),
  setUnread: (matchId, count) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [matchId]: count
      }
    })),
  reset: () =>
    set({
      typingMatches: {},
      unreadCounts: {}
    })
}));
