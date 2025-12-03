import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  receivedAt: string;
  data?: Record<string, any>;
};

type NotificationStore = {
  items: NotificationItem[];
  addNotification: (payload: NotificationItem) => void;
  hasUnseen: boolean;
  markSeen: () => void;
  clearAll: () => void;
  clearById: (id: string) => void;
  clearType: (type: string) => void;
  clear: () => void;
};

const MAX_NOTIFICATIONS = 50;

export const useNotificationsStore = create<NotificationStore>()(
  persist(
    (set) => ({
      items: [],
      hasUnseen: false,
      addNotification: (payload) =>
        set((state) => {
          const incomingType = payload.data?.type?.toString().toLowerCase?.() ?? "";
          const likerId = payload.data?.liker_id ?? payload.data?.likerId;
          const likerIncognito = payload.data?.liker_incognito ?? payload.data?.likerIncognito;
          if (incomingType.includes("like") && likerId) {
            const hasSameLiker = state.items.some(
              (item) =>
                (item.data?.type?.toString().toLowerCase?.() ?? "").includes("like") &&
                (item.data?.liker_id ?? item.data?.likerId) === likerId
            );
            if (hasSameLiker && likerIncognito !== true) {
              return state;
            }
          }
          const matchId =
            payload.data?.matchId ?? payload.data?.match_id ?? payload.data?.match_id ?? payload.data?.match;
          if (matchId) {
            const hasSameMatch = state.items.some(
              (item) =>
                (item.data?.matchId ?? item.data?.match_id ?? item.data?.match) === matchId &&
                (item.data?.type?.toString().includes("match") || payload.data?.type?.toString().includes("match"))
            );
            if (hasSameMatch) {
              return state;
            }
          }
          const existingId = state.items.findIndex((item) => item.id === payload.id);
          if (existingId >= 0) {
            return state;
          }
          const items = [payload, ...state.items].slice(0, MAX_NOTIFICATIONS);
          return { items, hasUnseen: true };
        }),
      markSeen: () =>
        set((state) => ({
          items: state.items,
          hasUnseen: false
        })),
      clearAll: () => set({ items: [], hasUnseen: false }),
      clearById: (id: string) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          hasUnseen: state.hasUnseen
        })),
      clearType: (type: string) =>
        set((state) => ({
          items: state.items.filter((item) => item.data?.type !== type),
          hasUnseen: state.hasUnseen
        })),
      clear: () => set({ items: [], hasUnseen: false })
    }),
    {
      name: "notifications-store",
      getStorage: () => AsyncStorage
    }
  )
);
