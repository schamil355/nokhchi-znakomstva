import { NativeModules } from "react-native";

// RevenueCat Production Public API Key
const RC_PUBLIC_API_KEY = "appl_eGZvLlqKXEVDwDoJdkBwkIzMNiZ";

// Entitlement configured in RevenueCat for premium access.
export const RC_ENTITLEMENT_ID = "nokhchi_znakomstva_pro";

const isRevenueCatAvailable = (): boolean => {
  return Boolean(NativeModules?.RNPurchases);
};

let didLogStoreKitProducts = false;

/**
 * Configure RevenueCat with the public API key and optional app user id.
 * Call this once during app startup, after you know the authenticated user id.
 */
export const configureRevenueCat = async (appUserId?: string | null) => {
  if (!isRevenueCatAvailable()) {
    if (__DEV__) {
      console.warn("[RevenueCat] Native module not available (simulator/Expo Go) – skipping setup");
    }
    return;
  }

  const { default: Purchases, LOG_LEVEL } = await import("react-native-purchases");

  await Purchases.configure({
    apiKey: RC_PUBLIC_API_KEY,
    appUserID: appUserId ?? undefined
  });

  // Production: nur Warnungen loggen (kein Debug-Overlay für Nutzer).
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

  if (__DEV__ && !didLogStoreKitProducts) {
    didLogStoreKitProducts = true;
    try {
      const products = await Purchases.getProducts(["aktuellXXX"]);
      console.log("[RevenueCat] StoreKit products:", products.map((p) => p.identifier));
    } catch (err) {
      console.warn("[RevenueCat] getProducts failed", err);
    }
  }
};
