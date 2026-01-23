import { useCallback, useEffect, useMemo, useState } from "react";
import { NativeModules, Platform } from "react-native";
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage
} from "react-native-purchases";
import { RC_ENTITLEMENT_ID } from "../lib/revenuecat";
import { setPremiumLocally } from "../services/subscriptionService";

type Status = "idle" | "loading" | "error";

type UseRevenueCatOptions = {
  loadOfferings?: boolean;
};

export const useRevenueCat = (options: UseRevenueCatOptions = {}) => {
  const { loadOfferings = true } = options;
  const [purchasesModule, setPurchasesModule] = useState<null | typeof import("react-native-purchases")>(null);
  const isAvailable = Boolean(purchasesModule?.default);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    if (Platform.OS === "web" || !NativeModules?.RNPurchases) {
      return;
    }
    let active = true;
    void import("react-native-purchases").then((mod) => {
      if (active) {
        setPurchasesModule(mod);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!purchasesModule?.default) {
      return;
    }
    setStatus("loading");
    setError(null);
    const Purchases = purchasesModule.default;
    const offeringsPromise = loadOfferings ? Purchases.getOfferings() : Promise.resolve(null);
    const [offeringsResult, infoResult] = await Promise.allSettled([
      offeringsPromise,
      Purchases.getCustomerInfo()
    ]);

    let nextStatus: Status = "idle";
    let nextError: unknown | null = null;

    if (infoResult.status === "fulfilled") {
      setCustomerInfo(infoResult.value);
    } else {
      nextStatus = "error";
      nextError = infoResult.reason ?? new Error("Failed to load customer info");
    }

    if (loadOfferings) {
      if (offeringsResult.status === "fulfilled" && offeringsResult.value) {
        setOfferings(offeringsResult.value);
      } else if (!nextError) {
        nextError = offeringsResult.reason ?? new Error("Failed to load offerings");
      }
    }

    setStatus(nextStatus);
    setError(nextError);
  }, [isAvailable, loadOfferings]);

  useEffect(() => {
    if (!purchasesModule?.default) {
      return;
    }
    const Purchases = purchasesModule.default;
    void refresh();
    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [purchasesModule, refresh]);

  const isPro = useMemo(() => {
    const entitlements = customerInfo?.entitlements.active ?? {};
    if (entitlements[RC_ENTITLEMENT_ID]) {
      return true;
    }
    if (Object.keys(entitlements).length > 0) {
      return true;
    }
    return (customerInfo?.activeSubscriptions?.length ?? 0) > 0;
  }, [customerInfo]);

  useEffect(() => {
    if (!isPro) {
      return;
    }
    setPremiumLocally(true);
  }, [isPro]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    if (!purchasesModule?.default) {
      const unavailable = new Error("RevenueCat not available");
      return { ok: false, error: unavailable };
    }
    try {
      setStatus("loading");
      const Purchases = purchasesModule.default;
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      return { ok: true, info };
    } catch (err: any) {
      const rcErr = err as PurchasesError;
      if (rcErr?.userCancelled) {
        return { ok: false, cancelled: true };
      }
      setError(rcErr ?? new Error("Purchase failed"));
      return { ok: false, error: rcErr ?? new Error("Purchase failed") };
    } finally {
      setStatus("idle");
    }
  }, [purchasesModule]);

  const restore = useCallback(async () => {
    if (!purchasesModule?.default) {
      const unavailable = new Error("RevenueCat not available");
      return { ok: false, error: unavailable };
    }
    try {
      setStatus("loading");
      const Purchases = purchasesModule.default;
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return { ok: true, info };
    } catch (err: any) {
      setError(err ?? new Error("Restore failed"));
      return { ok: false, error: err ?? new Error("Restore failed") };
    } finally {
      setStatus("idle");
    }
  }, [purchasesModule]);

  const currentOffering: PurchasesOffering | null = offerings?.current ?? null;

  return {
    offerings,
    currentOffering,
    customerInfo,
    isPro,
    status,
    error,
    refresh,
    purchasePackage,
    restore
  };
};
