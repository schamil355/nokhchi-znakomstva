import { Platform } from "react-native";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const registerServiceWorker = () => {
  if (Platform.OS !== "web") {
    return;
  }
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => console.warn("[PWA] service worker registration failed", error));
  });
};

export const isStandaloneMode = () => {
  if (Platform.OS !== "web") {
    return false;
  }
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    (navigator as any)?.standalone === true
  );
};

export const isIOSDevice = () => {
  if (Platform.OS !== "web") {
    return false;
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent ?? "");
};

export const isAndroidDevice = () => {
  if (Platform.OS !== "web") {
    return false;
  }
  return /android/i.test(navigator.userAgent ?? "");
};

export type { BeforeInstallPromptEvent };
