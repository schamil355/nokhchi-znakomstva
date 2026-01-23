import { Platform } from "react-native";

type LaunchContext = {
  isWeb: boolean;
  isStandalone: boolean;
  source: string | null;
  hasAuthParams: boolean;
};

const getDisplayModeStandalone = () => {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }
  }
  return Boolean((navigator as any)?.standalone);
};

export const getWebLaunchContext = (): LaunchContext => {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return { isWeb: false, isStandalone: false, source: null, hasAuthParams: false };
  }
  const url = new URL(window.location.href);
  const source = url.searchParams.get("source");
  const hasAuthParams =
    url.searchParams.has("code") ||
    /access_token=|refresh_token=/.test(window.location.hash ?? "");
  return {
    isWeb: true,
    isStandalone: getDisplayModeStandalone(),
    source,
    hasAuthParams
  };
};

export const isWebPwaLaunch = () => {
  const ctx = getWebLaunchContext();
  if (!ctx.isWeb) return false;
  if (ctx.source === "pwa" || ctx.source === "app") return true;
  if (ctx.isStandalone) return true;
  if (ctx.hasAuthParams) return true;
  return false;
};
