import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useEntitlements } from "./hooks";
import { useToast } from "../../components/ToastProvider";
import { useTranslation } from "../../lib/i18n";
import { usePriceDisplay } from "./usePriceDisplay";
import type { Offerings, Package } from "react-native-purchases";
import { getPurchasesApi } from "../../lib/revenuecat";
import { useRegionOffering } from "../../lib/region";

const PaywallScreen = (): JSX.Element => {
  const router = useRouter();
  const {
    entitlements,
    isLoading: entitlementsLoading,
    isRestoring,
    error,
    refreshEntitlements,
    restorePurchases,
  } = useEntitlements();
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [isFetchingOffers, setIsFetchingOffers] = useState(false);
  const [purchaseState, setPurchaseState] = useState<Record<string, boolean>>({});
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { data: region, isLoading: isRegionLoading } = useRegionOffering();
  const paywallDisabled = region?.paywallMode === "none";

  const loadOfferings = useCallback(async () => {
    if (paywallDisabled) {
      setIsFetchingOffers(false);
      setOfferings(null);
      return;
    }
    setIsFetchingOffers(true);
    try {
      const Purchases = getPurchasesApi();
      if (!Purchases) {
        setOfferings(null);
        showToast(t("paywall.toast.purchaseUnsupported"), "info");
        return;
      }
      const fetched = await Purchases.getOfferings();
      setOfferings(fetched);
    } catch (err: any) {
      showToast(err?.message ?? t("paywall.toast.offerError"), "error");
    } finally {
      setIsFetchingOffers(false);
    }
  }, [paywallDisabled, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      loadOfferings();
    }, [loadOfferings]),
  );

  useEffect(() => {
    if (entitlements.unlimitedSwipes) {
      router.replace("/discovery");
    }
  }, [entitlements.unlimitedSwipes, router]);

  useEffect(() => {
    if (paywallDisabled) {
      setIsFetchingOffers(false);
    }
  }, [paywallDisabled]);

  const currentPackages = useMemo(
    () => offerings?.current?.availablePackages ?? [],
    [offerings],
  );

  const handlePurchase = async (pkg: Package) => {
    setPurchaseState((prev) => ({ ...prev, [pkg.identifier]: true }));
    try {
      const Purchases = getPurchasesApi();
      if (!Purchases) {
        showToast(t("paywall.toast.purchaseUnsupported"), "info");
        return;
      }
      await Purchases.purchasePackage(pkg);
      await refreshEntitlements();
      showToast(t("paywall.toast.purchaseSuccess"), "success");
    } catch (err: any) {
      if (err?.userCancelled) {
        showToast(t("paywall.toast.purchaseCancelled"), "info");
      } else {
        showToast(err?.message ?? t("paywall.toast.purchaseFailed"), "error");
      }
    } finally {
      setPurchaseState((prev) => ({ ...prev, [pkg.identifier]: false }));
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      showToast(t("paywall.toast.restoreSuccess"), "success");
    } catch (err: any) {
      if (!err?.userCancelled) {
        showToast(err?.message ?? t("paywall.toast.restoreFailed"), "error");
      }
    }
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await refreshEntitlements({ trigger: "manual" });
      showToast(t("paywall.toast.syncSuccess"), "success");
    } catch (err: any) {
      showToast(err?.message ?? t("paywall.toast.syncFailed"), "error");
    } finally {
      setIsManualSyncing(false);
    }
  };

  const swipesSummary = entitlements.unlimitedSwipes
    ? t("paywall.swipes.unlimited")
    : t("paywall.swipes.limited");
  const boostSummary = entitlements.dailyBoost
    ? t("paywall.boost.available")
    : t("paywall.boost.locked");
  const superSummary = entitlements.superLikes;

  const unlimitedStatusLabel = entitlements.unlimitedSwipes
    ? t("paywall.statusActive")
    : t("paywall.statusLocked");
  const boostStatusLabel = entitlements.dailyBoost
    ? t("paywall.statusActive")
    : t("paywall.statusLocked");
  const superlikeStatusLabel =
    entitlements.superLikes > 0
      ? t("paywall.statusActiveWithCount", { count: entitlements.superLikes })
      : t("paywall.statusLocked");

  const showLoader = entitlementsLoading || isFetchingOffers || isRegionLoading;

  return (
    <ScrollView testID="paywall-screen" contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("paywall.title")}</Text>
      <Text style={styles.subtitle}>
        {t("paywall.subtitle", {
          swipes: swipesSummary,
          boost: boostSummary,
          super: superSummary,
        })}
      </Text>

      <View style={styles.statusCard} testID="paywall-status-card">
        <Text style={styles.statusTitle}>{t("paywall.statusTitle")}</Text>
        <Text style={styles.statusRow} testID="paywall-unlimited-status">
          {t("paywall.unlimitedLabel")}: {unlimitedStatusLabel}
        </Text>
        <Text style={styles.statusRow} testID="paywall-boost-status">
          {t("paywall.boostLabel")}: {boostStatusLabel}
        </Text>
        <Text style={styles.statusRow} testID="paywall-superlike-status">
          {t("paywall.superLikeLabel")}: {superlikeStatusLabel}
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {paywallDisabled ? (
        <View style={styles.regionNotice} testID="paywall-region-disabled">
          <Text style={styles.regionNoticeText}>{t("region.no_paywall_text")}</Text>
        </View>
      ) : showLoader ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" />
      ) : currentPackages.length === 0 ? (
        <Text style={styles.infoText}>{t("paywall.noOffers")}</Text>
      ) : (
        currentPackages.map((pkg) => (
          <PaywallPackageCard
            key={pkg.identifier}
            pkg={pkg}
            onPurchase={() => handlePurchase(pkg)}
            isProcessing={Boolean(purchaseState[pkg.identifier])}
            buyLabel={t("paywall.buy")}
          />
        ))
      )}

      {!paywallDisabled && Platform.OS !== "ios" ? (
        <Pressable
          testID="paywall-manual-sync"
          style={[styles.secondaryButton, isManualSyncing && styles.ctaButtonDisabled]}
          onPress={handleManualSync}
          disabled={isManualSyncing}
        >
          {isManualSyncing ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.secondaryText}>{t("paywall.manualSync")}</Text>
          )}
        </Pressable>
      ) : null}

      {!paywallDisabled ? (
        <Pressable
          testID="paywall-restore"
          style={[styles.secondaryButton, isRestoring && styles.ctaButtonDisabled]}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.secondaryText}>{t("paywall.restore")}</Text>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
};

type PaywallPackageCardProps = {
  pkg: Package;
  onPurchase: () => void;
  isProcessing: boolean;
  buyLabel: string;
};

const PaywallPackageCard = ({
  pkg,
  onPurchase,
  isProcessing,
  buyLabel,
}: PaywallPackageCardProps) => {
  const { pricePerMonth, price, isLoading } = usePriceDisplay(pkg.product.identifier);
  const displayPrice = pricePerMonth ?? price ?? pkg.product.priceString;
  const disableCta = isProcessing || isLoading;

  return (
    <View style={styles.offerCard}>
      <Text style={styles.offerTitle}>{pkg.product.title}</Text>
      {isLoading && !displayPrice ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.offerPrice}>{displayPrice}</Text>
      )}
      <Text style={styles.perk}>{pkg.product.description}</Text>
      <Pressable
        style={[styles.ctaButton, disableCta && styles.ctaButtonDisabled]}
        onPress={onPurchase}
        disabled={disableCta}
      >
        {disableCta ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{buyLabel}</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
    backgroundColor: "#f7f7f8",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: "#4b5563",
  },
  errorText: {
    color: "#dc2626",
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  statusTitle: {
    fontWeight: "600",
    fontSize: 16,
  },
  statusRow: {
    color: "#1f2937",
  },
  infoText: {
    color: "#6b7280",
  },
  regionNotice: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  regionNoticeText: {
    color: "#1f2937",
    lineHeight: 20,
  },
  offerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  offerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2563eb",
  },
  perk: {
    color: "#4b5563",
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  tertiaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  tertiaryText: {
    color: "#4b5563",
    fontWeight: "600",
  },
});

export default PaywallScreen;
