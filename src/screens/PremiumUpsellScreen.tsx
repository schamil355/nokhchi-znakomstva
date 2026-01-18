import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { LinearGradient } from "expo-linear-gradient";
import { useRevenueCat } from "../hooks/useRevenueCat";
import type { PurchasesPackage } from "react-native-purchases";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { useAuthStore } from "../state/authStore";
import { refetchProfile } from "../services/profileService";
import { createStripeCheckoutSession, fetchStripePlanAvailability } from "../services/stripeCheckoutService";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const translations = {
  de: {
    title: "Premium freischalten",
    subtitle: "Mehr sehen, zuerst vorstellen, anonym bleiben.",
    benefitSeeLikes: "Sieh wer dich geliket hat",
    benefitSeeLikesDesc: "Alle Likes sofort sichtbar.",
    benefitInstachats: "Direktnachricht senden",
    benefitInstachatsDesc: "Warte nicht bis zum Match – schreib direkt.",
    benefitHideNearby: "Unsichtbar in der Nähe",
    benefitHideNearbyDesc: "Wähle deinen Schutzradius, damit Nachbarn/Freunde dich nicht sehen.",
    benefitAnon: "Anonym stöbern",
    benefitAnonDesc: "Anonym bleiben – nur wer von dir geliket wurde, sieht dein Foto.",
    choosePlan: "Wähle deinen Plan",
    planMonthly: "Monatlich",
    planAnnual: "Jährlich",
    planWeekly: "Wöchentlich",
    planTwoMonth: "2 Monate",
    planThreeMonth: "3 Monate",
    planSixMonth: "6 Monate",
    planLifetime: "Lebenslang",
    perWeek: "pro Woche",
    perMonth: "pro Monat",
    perTwoMonths: "alle 2 Monate",
    perThreeMonths: "alle 3 Monate",
    perSixMonths: "alle 6 Monate",
    perYear: "pro Jahr",
    oneTime: "einmalig",
    loadingOffers: "Angebote werden geladen…",
    noOffers: "Aktuell keine Angebote verfügbar.",
    retry: "Erneut laden",
    restore: "Käufe wiederherstellen",
    purchaseFailed: "Kauf fehlgeschlagen. Bitte versuche es erneut.",
    legalPrefix: "Mit dem Fortfahren stimmst du unseren",
    legalSuffix: " zu.",
    terms: "Bedingungen",
    privacy: "Datenschutz",
    and: "und",
    subscriptionInfoTitle: "Abo-Infos",
    subInfoPlan: "Plan",
    subInfoDuration: "Laufzeit",
    subInfoPrice: "Preis",
    subInfoAutoRenew:
      "Automatisch verlängerndes Abo. Kündigung jederzeit in den App-Store-Einstellungen (mind. 24 Std. vor Ablauf).",
    subInfoOneTime: "Einmaliger Kauf, keine automatische Verlängerung.",
    durationWeek: "1 Woche",
    durationMonth: "1 Monat",
    durationTwoMonths: "2 Monate",
    durationThreeMonths: "3 Monate",
    durationSixMonths: "6 Monate",
    durationYear: "1 Jahr",
    durationLifetime: "einmalig",
    alreadyPremium: "Du hast bereits Premium.",
    cta: "Premium holen",
    ctaHint: "Bitte wähle ein Paket aus.",
    webCta: "Weiter zur Zahlung",
    webUnavailable: "Web-Zahlung ist in deinem Land aktuell nicht verfügbar.",
    webFallback: "Zahlung in deiner Währung ist aktuell nicht verfügbar. Preise werden in EUR angezeigt.",
    webSuccess: "Zahlung abgeschlossen. Premium wird gleich aktiviert.",
    webCancel: "Zahlung abgebrochen.",
    later: "Später",
    badge: "Premium",
    soon: "Bald verfügbar"
  },
  fr: {
    title: "Débloque Premium",
    subtitle: "Voir plus, initier l'intro, rester discret.",
    benefitSeeLikes: "Voir qui t’a liké",
    benefitSeeLikesDesc: "Tous les likes visibles immédiatement.",
    benefitInstachats: "Envoyer un message direct",
    benefitInstachatsDesc: "N’attends pas le match — écris directement.",
    benefitHideNearby: "Invisible à proximité",
    benefitHideNearbyDesc: "Choisis ton rayon pour rester introuvable par les voisins/amis.",
    benefitAnon: "Parcourir en privé",
    benefitAnonDesc: "Reste anonyme — seule la personne que tu as likée voit ta photo.",
    choosePlan: "Choisis ton plan",
    planMonthly: "Mensuel",
    planAnnual: "Annuel",
    planWeekly: "Hebdomadaire",
    planTwoMonth: "2 mois",
    planThreeMonth: "3 mois",
    planSixMonth: "6 mois",
    planLifetime: "À vie",
    perWeek: "par semaine",
    perMonth: "par mois",
    perTwoMonths: "tous les 2 mois",
    perThreeMonths: "tous les 3 mois",
    perSixMonths: "tous les 6 mois",
    perYear: "par an",
    oneTime: "paiement unique",
    loadingOffers: "Chargement des offres…",
    noOffers: "Aucune offre disponible pour le moment.",
    retry: "Réessayer",
    restore: "Restaurer les achats",
    purchaseFailed: "L'achat a échoué. Réessaie.",
    legalPrefix: "En continuant, tu acceptes nos",
    legalSuffix: ".",
    terms: "Conditions",
    privacy: "Politique de confidentialité",
    and: "et",
    subscriptionInfoTitle: "Infos abonnement",
    subInfoPlan: "Plan",
    subInfoDuration: "Durée",
    subInfoPrice: "Prix",
    subInfoAutoRenew:
      "Abonnement à renouvellement automatique. Annule à tout moment dans les réglages App Store (au moins 24 h avant la fin).",
    subInfoOneTime: "Achat unique, pas de renouvellement automatique.",
    durationWeek: "1 semaine",
    durationMonth: "1 mois",
    durationTwoMonths: "2 mois",
    durationThreeMonths: "3 mois",
    durationSixMonths: "6 mois",
    durationYear: "1 an",
    durationLifetime: "achat unique",
    alreadyPremium: "Tu as déjà Premium.",
    cta: "Obtenir Premium",
    ctaHint: "Choisis d'abord un plan.",
    webCta: "Continuer vers le paiement",
    webUnavailable: "Le paiement web n'est pas disponible dans votre pays pour le moment.",
    webFallback: "Le paiement dans votre devise n'est pas disponible. Les prix sont affichés en EUR.",
    webSuccess: "Paiement effectué. Premium sera activé sous peu.",
    webCancel: "Paiement annulé.",
    later: "Plus tard",
    badge: "Premium",
    soon: "Bientôt"
  },
  en: {
    title: "Unlock Premium",
    subtitle: "See more, introduce first, stay hidden.",
    benefitSeeLikes: "See who liked you",
    benefitSeeLikesDesc: "All likes visible instantly.",
    benefitInstachats: "Send a direct message",
    benefitInstachatsDesc: "Don’t wait for a match — message directly.",
    benefitHideNearby: "Invisible to nearby users",
    benefitHideNearbyDesc: "Pick your safety radius so neighbors/friends won't see you.",
    benefitAnon: "Browse privately",
    benefitAnonDesc: "Stay anonymous — only the person you liked sees your photo.",
    choosePlan: "Choose your plan",
    planMonthly: "Monthly",
    planAnnual: "Annual",
    planWeekly: "Weekly",
    planTwoMonth: "2 months",
    planThreeMonth: "3 months",
    planSixMonth: "6 months",
    planLifetime: "Lifetime",
    perWeek: "per week",
    perMonth: "per month",
    perTwoMonths: "every 2 months",
    perThreeMonths: "every 3 months",
    perSixMonths: "every 6 months",
    perYear: "per year",
    oneTime: "one-time",
    loadingOffers: "Loading offers…",
    noOffers: "No offers available right now.",
    retry: "Try again",
    restore: "Restore purchases",
    purchaseFailed: "Purchase failed. Please try again.",
    legalPrefix: "By continuing you agree to our",
    legalSuffix: ".",
    terms: "Terms",
    privacy: "Privacy Policy",
    and: "and",
    subscriptionInfoTitle: "Subscription info",
    subInfoPlan: "Plan",
    subInfoDuration: "Duration",
    subInfoPrice: "Price",
    subInfoAutoRenew:
      "Auto-renewable subscription. Cancel anytime in App Store settings at least 24 hours before the end of the period.",
    subInfoOneTime: "One-time purchase, no auto-renewal.",
    durationWeek: "1 week",
    durationMonth: "1 month",
    durationTwoMonths: "2 months",
    durationThreeMonths: "3 months",
    durationSixMonths: "6 months",
    durationYear: "1 year",
    durationLifetime: "one-time",
    alreadyPremium: "You already have Premium.",
    cta: "Get Premium",
    ctaHint: "Please select a plan first.",
    webCta: "Continue to payment",
    webUnavailable: "Web payments are not available in your country yet.",
    webFallback: "Payments in your currency are unavailable. Prices are shown in EUR.",
    webSuccess: "Payment completed. Premium will activate shortly.",
    webCancel: "Payment cancelled.",
    later: "Later",
    badge: "Premium",
    soon: "Coming soon"
  },
  ru: {
    title: "Открыть Premium",
    subtitle: "Видеть больше, делать первый шаг, оставаться скрытым.",
    benefitSeeLikes: "Смотри, кто тебя лайкнул",
    benefitSeeLikesDesc: "Все лайки сразу видны.",
    benefitInstachats: "Отправить прямое сообщение",
    benefitInstachatsDesc: "Не жди матча — пиши напрямую.",
    benefitHideNearby: "Невидимка рядом",
    benefitHideNearbyDesc: "Выбери радиус защиты, чтобы соседи и знакомые не видели тебя.",
    benefitAnon: "Просмотр анонимно",
    benefitAnonDesc: "Оставайся анонимным — фото увидит только тот, кому ты поставил лайк.",
    choosePlan: "Выбери план",
    planMonthly: "Ежемесячно",
    planAnnual: "Ежегодно",
    planWeekly: "Еженедельно",
    planTwoMonth: "2 месяца",
    planThreeMonth: "3 месяца",
    planSixMonth: "6 месяцев",
    planLifetime: "Навсегда",
    perWeek: "в неделю",
    perMonth: "в месяц",
    perTwoMonths: "раз в 2 месяца",
    perThreeMonths: "раз в 3 месяца",
    perSixMonths: "раз в 6 месяцев",
    perYear: "в год",
    oneTime: "единовременно",
    loadingOffers: "Загрузка предложений…",
    noOffers: "Предложения сейчас недоступны.",
    retry: "Повторить",
    restore: "Восстановить покупки",
    purchaseFailed: "Покупка не удалась. Попробуй еще раз.",
    legalPrefix: "Продолжая, вы соглашаетесь с нашими",
    legalSuffix: ".",
    terms: "Условиями",
    privacy: "Политикой конфиденциальности",
    and: "и",
    subscriptionInfoTitle: "Информация о подписке",
    subInfoPlan: "План",
    subInfoDuration: "Срок",
    subInfoPrice: "Цена",
    subInfoAutoRenew:
      "Подписка с автопродлением. Отменить можно в настройках App Store (минимум за 24 часа до конца периода).",
    subInfoOneTime: "Разовая покупка, без автопродления.",
    durationWeek: "1 неделя",
    durationMonth: "1 месяц",
    durationTwoMonths: "2 месяца",
    durationThreeMonths: "3 месяца",
    durationSixMonths: "6 месяцев",
    durationYear: "1 год",
    durationLifetime: "разовая",
    alreadyPremium: "У тебя уже есть Premium.",
    cta: "Получить Premium",
    ctaHint: "Сначала выбери план.",
    webCta: "Перейти к оплате",
    webUnavailable: "Оплата через веб недоступна в вашей стране.",
    webFallback: "Оплата в вашей валюте недоступна. Цены показаны в EUR.",
    webSuccess: "Оплата прошла. Premium будет активирован в ближайшее время.",
    webCancel: "Оплата отменена.",
    later: "Позже",
    badge: "Premium",
    soon: "Скоро"
  }
};

const PremiumUpsellScreen = () => {
  const copy = useLocalizedCopy(translations);
  const errorCopy = useErrorCopy();
  const navigation = useNavigation<any>();
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const isWeb = Platform.OS === "web";
  const { currentOffering, status, error, isPro, purchasePackage, restore, refresh } = useRevenueCat();
  const packages = useMemo(() => currentOffering?.availablePackages ?? [], [currentOffering]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [webPlanId, setWebPlanId] = useState<"monthly" | "yearly">("monthly");
  const [webCurrency, setWebCurrency] = useState<"EUR" | "NOK">("EUR");
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webNotice, setWebNotice] = useState<string | null>(null);
  const [webPlanIds, setWebPlanIds] = useState<("monthly" | "yearly")[] | null>(null);
  const [webPlanError, setWebPlanError] = useState<string | null>(null);
  const [webCurrencyNotice, setWebCurrencyNotice] = useState<string | null>(null);
  const didAutoCloseRef = useRef(false);

  const benefits = [
    { title: copy.benefitSeeLikes, desc: copy.benefitSeeLikesDesc },
    { title: copy.benefitInstachats, desc: copy.benefitInstachatsDesc },
    { title: copy.benefitHideNearby, desc: copy.benefitHideNearbyDesc },
    { title: copy.benefitAnon, desc: copy.benefitAnonDesc }
  ];

  const isPremium = isWeb ? Boolean(profile?.isPremium) : isPro;
  const currency = useMemo(() => {
    const country =
      profile?.country ??
      session?.user?.user_metadata?.country ??
      null;
    if (typeof country === "string" && country.toUpperCase() === "NO") {
      return "NOK" as const;
    }
    if (typeof country === "string" && country.toUpperCase() === "RU") {
      return "RUB" as const;
    }
    return "EUR" as const;
  }, [profile?.country, session?.user?.user_metadata?.country]);

  const webPlans = useMemo(() => {
    const amounts =
      webCurrency === "NOK"
        ? { monthly: 15900, yearly: 99900 }
        : { monthly: 1499, yearly: 9999 };
    const plans = [
      {
        id: "monthly" as const,
        label: copy.planMonthly,
        periodLabel: copy.perMonth,
        durationLabel: copy.durationMonth,
        amountMinor: amounts.monthly
      },
      {
        id: "yearly" as const,
        label: copy.planAnnual,
        periodLabel: copy.perYear,
        durationLabel: copy.durationYear,
        amountMinor: amounts.yearly
      }
    ];
    if (webPlanIds) {
      return plans.filter((plan) => webPlanIds.includes(plan.id));
    }
    return plans;
  }, [
    webCurrency,
    copy.planMonthly,
    copy.planAnnual,
    copy.perMonth,
    copy.perYear,
    copy.durationMonth,
    copy.durationYear,
    webPlanIds
  ]);

  useEffect(() => {
    if (!packages.length) return;
    setSelectedPackageId((prev) => (packages.some((pkg) => pkg.identifier === prev) ? prev : packages[0].identifier));
  }, [packages]);

  useEffect(() => {
    if (!isWeb) return;
    if (!webPlans.length) return;
    setWebPlanId((prev) => (webPlans.some((plan) => plan.id === prev) ? prev : webPlans[0].id));
  }, [isWeb, webPlans]);

  useEffect(() => {
    if (!isWeb) return;
    let active = true;
    const preferredCurrency = currency === "NOK" ? "NOK" : "EUR";
    setWebPlanIds(null);
    setWebPlanError(null);
    setWebCurrencyNotice(null);
    setWebCurrency(preferredCurrency);

    const loadPlans = async () => {
      try {
        const data = await fetchStripePlanAvailability(preferredCurrency);
        if (!active) return;
        if (data.plans?.length) {
          setWebPlanIds(data.plans);
          if (preferredCurrency === "EUR" && currency !== "EUR") {
            setWebCurrencyNotice(copy.webFallback);
          }
          return;
        }

        if (preferredCurrency !== "EUR") {
          const fallback = await fetchStripePlanAvailability("EUR");
          if (!active) return;
          if (fallback.plans?.length) {
            setWebCurrency("EUR");
            setWebPlanIds(fallback.plans ?? []);
            setWebCurrencyNotice(copy.webFallback);
            return;
          }
        }

        setWebPlanIds([]);
      } catch (planError) {
        if (!active) return;
        setWebPlanIds(null);
        setWebPlanError(getErrorMessage(planError, errorCopy, copy.webUnavailable));
      }
    };

    void loadPlans();
    return () => {
      active = false;
    };
  }, [copy.webFallback, copy.webUnavailable, currency, errorCopy, isWeb]);

  useEffect(() => {
    if (!isPremium || didAutoCloseRef.current) return;
    didAutoCloseRef.current = true;
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (typeof navigation?.navigate === "function") {
      navigation.navigate("Main");
    }
  }, [isPremium, navigation]);

  const selectedPackage = packages.find((pkg) => pkg.identifier === selectedPackageId) ?? packages[0] ?? null;
  const webSelectedPlan = webPlans.find((plan) => plan.id === webPlanId) ?? webPlans[0] ?? null;
  const isLoading = status === "loading";
  const errorMessage = error ? getErrorMessage(error, errorCopy, copy.purchaseFailed) : null;
  const webInlineError = webError ?? webPlanError;

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      setWebNotice(copy.webSuccess);
      void refetchProfile();
    } else if (checkout === "cancel") {
      setWebNotice(copy.webCancel);
    }
  }, [copy.webCancel, copy.webSuccess, isWeb]);

  const getPlanLabel = (pkg: PurchasesPackage) => {
    switch (pkg.packageType) {
      case "WEEKLY":
        return copy.planWeekly;
      case "MONTHLY":
        return copy.planMonthly;
      case "TWO_MONTH":
        return copy.planTwoMonth;
      case "THREE_MONTH":
        return copy.planThreeMonth;
      case "SIX_MONTH":
        return copy.planSixMonth;
      case "ANNUAL":
        return copy.planAnnual;
      case "LIFETIME":
        return copy.planLifetime;
      default:
        return pkg.product?.title ?? copy.planMonthly;
    }
  };

  const getPeriodLabel = (pkg: PurchasesPackage) => {
    switch (pkg.packageType) {
      case "WEEKLY":
        return copy.perWeek;
      case "MONTHLY":
        return copy.perMonth;
      case "TWO_MONTH":
        return copy.perTwoMonths;
      case "THREE_MONTH":
        return copy.perThreeMonths;
      case "SIX_MONTH":
        return copy.perSixMonths;
      case "ANNUAL":
        return copy.perYear;
      case "LIFETIME":
        return copy.oneTime;
      default:
        return "";
    }
  };

  const getDurationLabel = (pkg: PurchasesPackage) => {
    switch (pkg.packageType) {
      case "WEEKLY":
        return copy.durationWeek;
      case "MONTHLY":
        return copy.durationMonth;
      case "TWO_MONTH":
        return copy.durationTwoMonths;
      case "THREE_MONTH":
        return copy.durationThreeMonths;
      case "SIX_MONTH":
        return copy.durationSixMonths;
      case "ANNUAL":
        return copy.durationYear;
      case "LIFETIME":
        return copy.durationLifetime;
      default:
        return "";
    }
  };

  const formatTotalPrice = (pkg: PurchasesPackage) => pkg.product?.priceString ?? "";

  const formatWebPrice = (amountMinor: number) => {
    const amount = amountMinor / 100;
    if (typeof Intl === "undefined") {
      return `${amount.toFixed(2)} ${webCurrency}`;
    }
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: webCurrency }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${webCurrency}`;
    }
  };

  const handleWebCheckout = async () => {
    if (!webSelectedPlan) {
      setWebError(copy.ctaHint);
      return;
    }
    setWebLoading(true);
    setWebError(null);
    try {
      const { url } = await createStripeCheckoutSession({
        planId: webSelectedPlan.id,
        currency: webCurrency,
      });
      if (typeof window !== "undefined") {
        window.location.assign(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (checkoutError) {
      setWebError(getErrorMessage(checkoutError, errorCopy, copy.purchaseFailed));
    } finally {
      setWebLoading(false);
    }
  };

  const primaryDisabled = isWeb
    ? webLoading || !webSelectedPlan || isPremium
    : isLoading || !selectedPackage || isPremium;

  const handleUpgrade = async () => {
    if (!selectedPackage) {
      Alert.alert(copy.title, copy.ctaHint);
      return;
    }
    const result = await purchasePackage(selectedPackage);
    if (!result.ok && !result.cancelled) {
      const purchaseError = (result as { error?: unknown })?.error ?? error;
      logError(purchaseError, "purchase");
      Alert.alert(copy.title, getErrorMessage(purchaseError, errorCopy, copy.purchaseFailed));
    }
  };

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.badge}>
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgeInner}
            >
              <Text style={styles.badgeText}>{copy.badge}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.card}>
            {benefits.map((benefit, index) => (
              <View key={benefit.title} style={[styles.row, index !== benefits.length - 1 && styles.rowDivider]}>
                <View style={styles.bullet} />
                <View style={styles.rowText}>
                  <View style={styles.rowTitleWrapper}>
                    <Text style={styles.rowTitle}>{benefit.title}</Text>
                    {benefit.title === copy.benefitHideNearby ? (
                      <LinearGradient
                        colors={[PALETTE.gold, "#8b6c2a"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.inlineBadge}
                      >
                        <Text style={styles.inlineBadgeText}>{copy.soon}</Text>
                      </LinearGradient>
                    ) : null}
                  </View>
                  <Text style={styles.rowDesc}>{benefit.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.planSection}>
            <Text style={styles.sectionTitle}>{copy.choosePlan}</Text>
                {isPremium ? <Text style={styles.planHint}>{copy.alreadyPremium}</Text> : null}
            {isWeb ? (
              <>
                {webNotice ? <Text style={styles.noticeText}>{webNotice}</Text> : null}
                {webCurrencyNotice ? <Text style={styles.noticeText}>{webCurrencyNotice}</Text> : null}
                {webPlanIds === null && !webPlanError ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={PALETTE.gold} />
                    <Text style={styles.loadingText}>{copy.loadingOffers}</Text>
                  </View>
                ) : null}
                {!webPlanError && webPlanIds !== null && !webPlans.length ? (
                  <Text style={styles.emptyText}>{copy.webUnavailable}</Text>
                ) : null}
                {webPlans.length ? (
                  <View style={styles.planList}>
                    {webPlans.map((plan) => {
                      const isSelected = plan.id === webSelectedPlan?.id;
                      return (
                        <Pressable
                          key={plan.id}
                          style={[styles.planCard, isSelected && styles.planCardActive]}
                          onPress={() => setWebPlanId(plan.id)}
                        >
                          <View style={styles.planHeader}>
                            <Text style={styles.planTitle}>{plan.label}</Text>
                            <View style={[styles.planCheck, isSelected && styles.planCheckActive]}>
                              {isSelected ? <View style={styles.planCheckDot} /> : null}
                            </View>
                          </View>
                          <Text style={styles.planPrice}>{formatWebPrice(plan.amountMinor)}</Text>
                          {plan.periodLabel ? <Text style={styles.planPeriod}>{plan.periodLabel}</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                {webInlineError ? <Text style={styles.errorText}>{webInlineError}</Text> : null}
              </>
            ) : (
              <>
                {isLoading && !packages.length ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={PALETTE.gold} />
                    <Text style={styles.loadingText}>{copy.loadingOffers}</Text>
                  </View>
                ) : null}
                {!packages.length && !isLoading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>{copy.noOffers}</Text>
                    <Pressable style={styles.retryButton} onPress={refresh}>
                      <Text style={styles.retryText}>{copy.retry}</Text>
                    </Pressable>
                  </View>
                ) : null}
                {packages.length ? (
                  <View style={styles.planList}>
                    {packages.map((pkg) => {
                      const isSelected = pkg.identifier === selectedPackage?.identifier;
                      return (
                        <Pressable
                          key={pkg.identifier}
                          style={[styles.planCard, isSelected && styles.planCardActive]}
                          onPress={() => setSelectedPackageId(pkg.identifier)}
                        >
                          <View style={styles.planHeader}>
                            <Text style={styles.planTitle}>{getPlanLabel(pkg)}</Text>
                            <View style={[styles.planCheck, isSelected && styles.planCheckActive]}>
                              {isSelected ? <View style={styles.planCheckDot} /> : null}
                            </View>
                          </View>
                          <Text style={styles.planPrice}>{formatTotalPrice(pkg)}</Text>
                          {getPeriodLabel(pkg) ? (
                            <Text style={styles.planPeriod}>{getPeriodLabel(pkg)}</Text>
                          ) : null}
                          {pkg.product?.description ? (
                            <Text style={styles.planSub} numberOfLines={2}>
                              {pkg.product.description}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.primary, primaryDisabled && styles.primaryDisabled]}
            onPress={isWeb ? handleWebCheckout : handleUpgrade}
            disabled={primaryDisabled}
          >
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryInner, primaryDisabled && styles.primaryInnerDisabled]}
            >
              {isWeb ? (
                webLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>{copy.webCta}</Text>
                )
              ) : isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>{copy.cta}</Text>
              )}
            </LinearGradient>
          </Pressable>
          <View style={styles.footerLinks}>
            {!isWeb ? (
              <>
                <Pressable style={styles.linkButton} onPress={restore} disabled={isLoading}>
                  <Text style={styles.linkText}>{copy.restore}</Text>
                </Pressable>
                <Text style={styles.linkDivider}>•</Text>
              </>
            ) : null}
            <Pressable style={styles.linkButton} onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>{copy.later}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: 40
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 220,
    gap: 12
  },
  planSection: {
    marginTop: 18,
    gap: 10
  },
  sectionTitle: {
    color: PALETTE.sand,
    fontSize: 18,
    fontWeight: "700"
  },
  planHint: {
    color: "rgba(242,231,215,0.72)",
    fontSize: 13
  },
  planList: {
    gap: 10
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.3)",
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.22)"
  },
  planCardActive: {
    borderColor: PALETTE.gold,
    backgroundColor: "rgba(217,192,143,0.12)"
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  planTitle: {
    color: "rgba(242,231,215,0.78)",
    fontSize: 14,
    fontWeight: "700"
  },
  planPrice: {
    marginTop: 8,
    color: PALETTE.gold,
    fontSize: 20,
    fontWeight: "800"
  },
  planPeriod: {
    marginTop: 2,
    color: "rgba(242,231,215,0.65)",
    fontSize: 12,
    fontWeight: "600"
  },
  planSub: {
    marginTop: 4,
    color: "rgba(242,231,215,0.7)",
    fontSize: 12
  },
  planCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.5)",
    alignItems: "center",
    justifyContent: "center"
  },
  planCheckActive: {
    borderColor: PALETTE.gold
  },
  planCheckDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.gold
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  loadingText: {
    color: "rgba(242,231,215,0.72)",
    fontSize: 13
  },
  emptyState: {
    alignItems: "flex-start",
    gap: 10
  },
  emptyText: {
    color: "rgba(242,231,215,0.7)",
    fontSize: 13
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.4)"
  },
  retryText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 13
  },
  errorText: {
    color: "#ffb4a2",
    fontSize: 12
  },
  noticeText: {
    color: "rgba(217,192,143,0.9)",
    fontSize: 12
  },
  subInfoCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.3)",
    backgroundColor: "rgba(0,0,0,0.2)",
    padding: 12,
    gap: 6
  },
  subInfoTitle: {
    color: PALETTE.sand,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  subInfoLabel: {
    color: "rgba(242,231,215,0.7)",
    fontSize: 12
  },
  subInfoValue: {
    color: PALETTE.sand,
    fontSize: 12,
    fontWeight: "600"
  },
  subInfoNote: {
    color: "rgba(242,231,215,0.7)",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    marginBottom: 10,
    backgroundColor: "transparent"
  },
  badgeInner: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center"
  },
  badgeText: {
    color: PALETTE.sand,
    fontWeight: "700"
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: PALETTE.sand,
    marginBottom: 6
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(242,231,215,0.82)",
    marginBottom: 20
  },
  card: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.32)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 2
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 6,
    alignItems: "flex-start"
  },
  rowTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderColor: "rgba(217,192,143,0.18)"
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PALETTE.gold,
    marginTop: 6
  },
  rowText: {
    flex: 1
  },
  inlineBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.gold,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  inlineBadgeText: {
    color: PALETTE.sand,
    fontWeight: "700",
    fontSize: 11
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.sand
  },
  rowDesc: {
    fontSize: 14,
    color: "rgba(242,231,215,0.78)",
    marginTop: 2
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: "transparent"
  },
  primary: {
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: PALETTE.gold,
    overflow: "hidden"
  },
  primaryDisabled: {
    borderColor: "rgba(217,192,143,0.35)"
  },
  primaryInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryInnerDisabled: {
    opacity: 0.7
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  footerLinks: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  linkText: {
    color: PALETTE.sand,
    fontSize: 14,
    fontWeight: "600"
  },
  linkDivider: {
    color: "rgba(242,231,215,0.5)"
  },
  legalText: {
    marginTop: 10,
    color: "rgba(242,231,215,0.6)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16
  },
  legalLink: {
    color: PALETTE.gold,
    fontWeight: "600"
  }
});

export default PremiumUpsellScreen;
