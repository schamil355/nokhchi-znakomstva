import { useCallback, useEffect, useMemo, useState } from "react";
import Purchases, {
  CustomerInfo,
  PurchasesError,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage
} from "react-native-purchases";
import { RC_ENTITLEMENT_ID } from "../lib/revenuecat";

type Status = "idle" | "loading" | "error";

export const useRevenueCat = () => {
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const [off, info] = await Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()]);
      setOfferings(off);
      setCustomerInfo(info);
      setStatus("idle");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message ?? "Failed to load offerings");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
    });
    return () => {
      listener.remove();
    };
  }, [refresh]);

  const isPro = useMemo(
    () => Boolean(customerInfo?.entitlements.active[RC_ENTITLEMENT_ID]),
    [customerInfo?.entitlements.active]
  );

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    try {
      setStatus("loading");
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      return { ok: true, info };
    } catch (err: any) {
      const rcErr = err as PurchasesError;
      if (rcErr?.userCancelled) {
        return { ok: false, cancelled: true };
      }
      setError(rcErr?.message ?? "Purchase failed");
      return { ok: false, error: rcErr };
    } finally {
      setStatus("idle");
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      setStatus("loading");
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return { ok: true, info };
    } catch (err: any) {
      setError(err?.message ?? "Restore failed");
      return { ok: false, error: err };
    } finally {
      setStatus("idle");
    }
  }, []);

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
