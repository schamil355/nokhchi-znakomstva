import { useMemo } from "react";
import type { Offerings, PurchasesPackage } from "react-native-purchases";
import { useQuery } from "@tanstack/react-query";
import { useRegionOffering } from "../../lib/region";
import {
  currencyForCountry,
  formatCurrency,
  isSupportedCurrency,
  SupportedCurrency,
} from "../../lib/currency";
import { getCurrentLocale, useTranslation } from "../../lib/i18n";
import { getPurchasesApi } from "../../lib/revenuecat";

const collectPackages = (offerings: Offerings | null) => {
  if (!offerings) {
    return [] as PurchasesPackage[];
  }
  const allPackages: PurchasesPackage[] = [];
  if (offerings.current?.availablePackages?.length) {
    allPackages.push(...offerings.current.availablePackages);
  }
  const allEntries = offerings.all ? Object.values(offerings.all) : [];
  allEntries.forEach((offering) => {
    if (offering?.availablePackages?.length) {
      allPackages.push(...offering.availablePackages);
    }
  });
  return allPackages;
};

export const usePriceDisplay = (productId: string) => {
  const { data: region } = useRegionOffering();
  const locale = getCurrentLocale();
  const { t } = useTranslation();

  const priceQuery = useQuery({
    queryKey: ["price-display", productId, region?.country, locale],
    enabled: Boolean(productId),
    staleTime: 60_000,
    queryFn: async () => {
      const Purchases = getPurchasesApi();
      if (!Purchases) {
        return null;
      }
      const offerings = await Purchases.getOfferings();
      const packages = collectPackages(offerings ?? null);
      const match = packages.find(
        (pkg) => pkg.identifier === productId || pkg.product.identifier === productId,
      );
      if (!match) {
        return null;
      }
      if (match.product.priceString) {
        return match.product.priceString;
      }
      const fallbackCurrency: SupportedCurrency = isSupportedCurrency(
        match.product.currencyCode,
      )
        ? (match.product.currencyCode as SupportedCurrency)
        : currencyForCountry(region?.country ?? "XX");
      return formatCurrency(match.product.price, fallbackCurrency, locale);
    },
  });

  const pricePerMonth = useMemo(() => {
    if (!priceQuery.data) {
      return null;
    }
    return t("paywall.pricePerMonth", { price: priceQuery.data });
  }, [priceQuery.data, t]);

  return {
    price: priceQuery.data ?? null,
    pricePerMonth,
    isLoading: priceQuery.isLoading,
  };
};
