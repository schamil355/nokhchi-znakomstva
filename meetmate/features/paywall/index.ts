export type PaywallFeature = "boost" | "superLike" | "unlimitedSwipes" | "readReceipts";

const includedInFreeTier: PaywallFeature[] = ["readReceipts"];

export const isPremiumFeature = (feature: PaywallFeature): boolean =>
  !includedInFreeTier.includes(feature);
export { useEntitlements } from "./hooks";
export { default as PaywallScreen } from "./PaywallScreen";
export { default as DebugEntitlementsScreen } from "./DebugEntitlementsScreen";
