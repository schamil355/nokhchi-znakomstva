import { Platform } from "react-native";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const registerServiceWorker = () => {
  if (Platform.OS !== "web") {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  if (!("serviceWorker" in navigator)) {
    return;
  }
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) {
      return;
    }
    refreshing = true;
    window.location.reload();
  });

  let registered = false;
  const register = () => {
    if (registered) {
      return;
    }
    registered = true;
    navigator.serviceWorker
      .register("/service-worker.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => console.warn("[PWA] service worker registration failed", error));
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
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
