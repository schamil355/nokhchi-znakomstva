import { Platform } from "react-native";
import Constants from "expo-constants";
import type PurchasesType from "react-native-purchases";

type PurchasesModule = PurchasesType;

let cachedPurchases: PurchasesModule | null | undefined;
let loggedUnavailable = false;

const loadPurchases = (): PurchasesModule | null => {
  if (cachedPurchases !== undefined) {
    return cachedPurchases;
  }
  try {
    const module = require("react-native-purchases");
    cachedPurchases = module.default ?? module;
  } catch (error) {
    cachedPurchases = null;
    if (!loggedUnavailable) {
      console.warn(
        "RevenueCat native module is not available (Expo Go?). Premium features are disabled until you use a dev build.",
      );
      loggedUnavailable = true;
    }
  }
  return cachedPurchases;
};

const IOS_KEY =
  Constants.expoConfig?.extra?.revenueCatIosKey ??
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ??
  process.env.RC_PUBLIC_IOS_KEY ??
  "";
const ANDROID_KEY =
  Constants.expoConfig?.extra?.revenueCatAndroidKey ??
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ??
  process.env.RC_PUBLIC_ANDROID_KEY ??
  "";

let configuredPlatform: "ios" | "android" | null = null;

const resolveApiKey = () => {
  if (Platform.OS === "ios") {
    return IOS_KEY;
  }
  return ANDROID_KEY;
};

export const isRevenueCatConfigured = () =>
  Boolean(resolveApiKey()) && Boolean(loadPurchases());

export const getPurchasesApi = () => loadPurchases();

export const configureRevenueCat = async (userId: string | null | undefined) => {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.warn("RevenueCat API key not configured for platform", Platform.OS);
    return;
  }

  const Purchases = loadPurchases();
  if (!Purchases) {
    return;
  }

  if (configuredPlatform !== Platform.OS) {
    await Purchases.configure({ apiKey });
    configuredPlatform = Platform.OS;
  }

  if (userId) {
    try {
      await Purchases.logIn(userId);
    } catch (error: any) {
      if (error?.userCancelled) return;
      console.warn("RevenueCat logIn failed", error);
    }
  } else {
    try {
      await Purchases.logOut();
    } catch (error) {
      console.warn("RevenueCat logOut failed", error);
    }
  }
};

export const setRevenueCatAttributes = async (attributes: Record<string, string>) => {
  const Purchases = loadPurchases();
  if (!Purchases) return;
  try {
    await Purchases.setAttributes(attributes);
  } catch (error) {
    console.warn("Failed to set RevenueCat attributes", error);
  }
};
