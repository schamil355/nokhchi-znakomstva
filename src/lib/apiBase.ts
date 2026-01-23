import Constants from "expo-constants";
import { Platform } from "react-native";

type RuntimeEnv = Record<string, unknown>;

const readRuntimeEnv = (): RuntimeEnv => {
  if (typeof globalThis === "undefined") {
    return {};
  }
  const anyGlobal = globalThis as {
    __ENV__?: unknown;
    __APP_CONFIG__?: unknown;
    __EXPO_PUBLIC_ENV__?: unknown;
    EXPO_PUBLIC_API_URL?: unknown;
    API_URL?: unknown;
  };
  const candidate = anyGlobal.__ENV__ ?? anyGlobal.__EXPO_PUBLIC_ENV__ ?? anyGlobal.__APP_CONFIG__ ?? {};
  const baseEnv = typeof candidate === "object" && candidate ? (candidate as RuntimeEnv) : {};
  return {
    ...baseEnv,
    EXPO_PUBLIC_API_URL: anyGlobal.EXPO_PUBLIC_API_URL ?? baseEnv.EXPO_PUBLIC_API_URL,
    API_URL: anyGlobal.API_URL ?? baseEnv.API_URL
  };
};

const readExpoExtra = () => {
  const expoConfig = Constants.expoConfig ?? (Constants as { manifest?: { extra?: unknown } }).manifest ?? {};
  const extra = (expoConfig as { extra?: unknown })?.extra ?? {};
  return typeof extra === "object" && extra ? (extra as RuntimeEnv) : {};
};

const normalizeBase = (value: unknown) => {
  if (!value) return null;
  return String(value).replace(/\/$/, "");
};

const guessApiBaseFromHost = (host?: string | null) => {
  if (!host) return null;
  const normalized = host.replace(/^www\./, "");
  if (normalized === "nokhchi-znakomstva.com") {
    return "https://nokhchi-znakomstva.onrender.com";
  }
  return null;
};

export const getApiBase = () => {
  const runtimeEnv = readRuntimeEnv();
  const extra = readExpoExtra();
  return (
    normalizeBase(runtimeEnv.EXPO_PUBLIC_API_URL ?? runtimeEnv.API_URL) ??
    normalizeBase(process.env.EXPO_PUBLIC_API_URL) ??
    normalizeBase(extra.EXPO_PUBLIC_API_URL ?? extra.apiUrl) ??
    (Platform.OS === "web" && typeof window !== "undefined"
      ? normalizeBase(guessApiBaseFromHost(window.location.hostname))
      : null)
  );
};
