import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import SafeAreaView from "../components/SafeAreaView";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { LinearGradient } from "expo-linear-gradient";
import { useRevenueCat } from "../hooks/useRevenueCat";
import type { PurchasesPackage } from "react-native-purchases";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { PRIVACY_URL, TERMS_URL } from "../lib/legalLinks";

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
    subtitle: "Mehr sehen, mehr schicken, anonym bleiben.",
    benefitSeeLikes: "Sieh, wer dich geliket hat",
    benefitSeeLikesDesc: "Alle Likes sofort sichtbar",
    benefitInstachats: "Direktchat senden",
    benefitInstachatsDesc: "Direkt anschreiben und den ersten Schritt machen.",
    benefitHideNearby: "Unsichtbar in der Nähe",
    benefitHideNearbyDesc: "Wähle deinen Schutzradius, damit Nachbarn/Freunde dich nicht sehen.",
    benefitAnon: "Anonym stöbern & liken",
    benefitAnonDesc: "Bleib unsichtbar und sende trotzdem Likes, die beim Gegenüber ankommen.",
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
    later: "Später",
    badge: "Premium",
    soon: "Bald verfügbar"
  },
  fr: {
    title: "Débloque Premium",
    subtitle: "Vois plus, écris en premier, reste discret.",
    benefitSeeLikes: "Voir qui t'a liké",
    benefitSeeLikesDesc: "Tous les likes visibles immédiatement.",
    benefitInstachats: "Envoyer un Directchat",
    benefitInstachatsDesc: "Écris en premier et lance la discussion.",
    benefitHideNearby: "Invisible à proximité",
    benefitHideNearbyDesc: "Choisis ton rayon pour rester introuvable par les voisins/amis.",
    benefitAnon: "Parcourir et liker en anonyme",
    benefitAnonDesc: "Reste invisible mais tes likes apparaissent chez l'autre.",
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
    later: "Plus tard",
    badge: "Premium",
    soon: "Bientôt"
  },
  en: {
    title: "Unlock Premium",
    subtitle: "See more, message first, stay hidden.",
    benefitSeeLikes: "See who liked you",
    benefitSeeLikesDesc: "Unlock every like instantly—no guessing.",
    benefitInstachats: "Send Direktchat",
    benefitInstachatsDesc: "Reach out first and spark the convo.",
    benefitHideNearby: "Invisible to nearby users",
    benefitHideNearbyDesc: "Pick your safety radius so neighbors/friends won't see you.",
    benefitAnon: "Browse & like anonymously",
    benefitAnonDesc: "Stay invisible but your likes still show up for others.",
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
    later: "Later",
    badge: "Premium",
    soon: "Coming soon"
  },
  ru: {
    title: "Открыть Premium",
    subtitle: "Видеть больше, писать первым, оставаться скрытым.",
    benefitSeeLikes: "Смотреть, кто лайкнул тебя",
    benefitSeeLikesDesc: "Все лайки сразу, без ожидания.",
    benefitInstachats: "Отправить Direktchat",
    benefitInstachatsDesc: "Пиши первым и начинай диалог.",
    benefitHideNearby: "Невидимка рядом",
    benefitHideNearbyDesc: "Выбери радиус защиты, чтобы соседи и знакомые не видели тебя.",
    benefitAnon: "Браузить и лайкать анонимно",
    benefitAnonDesc: "Оставайся невидимым, но твои лайки видны другим.",
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
    later: "Позже",
    badge: "Premium",
    soon: "Скоро"
  }
};

const PremiumUpsellScreen = () => {
  const copy = useLocalizedCopy(translations);
  const errorCopy = useErrorCopy();
  const navigation = useNavigation<any>();
  const { currentOffering, status, error, isPro, purchasePackage, restore, refresh } = useRevenueCat();
  const packages = useMemo(() => currentOffering?.availablePackages ?? [], [currentOffering]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const didAutoCloseRef = useRef(false);

  const benefits = [
    { title: copy.benefitSeeLikes, desc: copy.benefitSeeLikesDesc },
    { title: copy.benefitInstachats, desc: copy.benefitInstachatsDesc },
    { title: copy.benefitHideNearby, desc: copy.benefitHideNearbyDesc },
    { title: copy.benefitAnon, desc: copy.benefitAnonDesc }
  ];

  useEffect(() => {
    if (!packages.length) return;
    setSelectedPackageId((prev) => (packages.some((pkg) => pkg.identifier === prev) ? prev : packages[0].identifier));
  }, [packages]);

  useEffect(() => {
    if (!isPro || didAutoCloseRef.current) return;
    didAutoCloseRef.current = true;
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (typeof navigation?.navigate === "function") {
      navigation.navigate("Main");
    }
  }, [isPro, navigation]);

  const selectedPackage = packages.find((pkg) => pkg.identifier === selectedPackageId) ?? packages[0] ?? null;
  const isLoading = status === "loading";

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
            {isPro ? <Text style={styles.planHint}>{copy.alreadyPremium}</Text> : null}
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
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {selectedPackage ? (
              <View style={styles.subInfoCard}>
                <Text style={styles.subInfoTitle}>{copy.subscriptionInfoTitle}</Text>
                <View style={styles.subInfoRow}>
                  <Text style={styles.subInfoLabel}>{copy.subInfoPlan}</Text>
                  <Text style={styles.subInfoValue}>{getPlanLabel(selectedPackage)}</Text>
                </View>
                <View style={styles.subInfoRow}>
                  <Text style={styles.subInfoLabel}>{copy.subInfoDuration}</Text>
                  <Text style={styles.subInfoValue}>{getDurationLabel(selectedPackage)}</Text>
                </View>
                <View style={styles.subInfoRow}>
                  <Text style={styles.subInfoLabel}>{copy.subInfoPrice}</Text>
                  <Text style={styles.subInfoValue}>{formatTotalPrice(selectedPackage)}</Text>
                </View>
                <Text style={styles.subInfoNote}>
                  {selectedPackage.packageType === "LIFETIME" ? copy.subInfoOneTime : copy.subInfoAutoRenew}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={[styles.primary, (isLoading || !selectedPackage || isPro) && styles.primaryDisabled]} onPress={handleUpgrade} disabled={isLoading || !selectedPackage || isPro}>
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryInner, (isLoading || !selectedPackage || isPro) && styles.primaryInnerDisabled]}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{copy.cta}</Text>}
            </LinearGradient>
          </Pressable>
          <View style={styles.footerLinks}>
            <Pressable style={styles.linkButton} onPress={restore} disabled={isLoading}>
              <Text style={styles.linkText}>{copy.restore}</Text>
            </Pressable>
            <Text style={styles.linkDivider}>•</Text>
            <Pressable style={styles.linkButton} onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>{copy.later}</Text>
            </Pressable>
          </View>
          <Text style={styles.legalText}>
            {copy.legalPrefix}{" "}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)}>
              {copy.terms}
            </Text>{" "}
            {copy.and}{" "}
            <Text style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)}>
              {copy.privacy}
            </Text>
            {copy.legalSuffix}
          </Text>
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
