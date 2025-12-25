import React from "react";
import { Alert, NativeModules, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { RC_ENTITLEMENT_ID } from "../lib/revenuecat";
import { LinearGradient } from "expo-linear-gradient";

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
    cta: "Premium holen",
    ctaHint: "Upgrade folgt hier. Bald verfügbar.",
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
    cta: "Obtenir Premium",
    ctaHint: "Le flux d'achat arrive bientôt.",
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
    cta: "Get Premium",
    ctaHint: "Upgrade flow coming soon.",
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
    cta: "Получить Premium",
    ctaHint: "Оплата появится скоро.",
    later: "Позже",
    badge: "Premium",
    soon: "Скоро"
  }
};

const PremiumUpsellScreen = () => {
  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();

  const benefits = [
    { title: copy.benefitSeeLikes, desc: copy.benefitSeeLikesDesc },
    { title: copy.benefitInstachats, desc: copy.benefitInstachatsDesc },
    { title: copy.benefitHideNearby, desc: copy.benefitHideNearbyDesc },
    { title: copy.benefitAnon, desc: copy.benefitAnonDesc }
  ];

  const handleUpgrade = async () => {
    if (!NativeModules?.RNPurchasesUI) {
      console.warn("[Paywall] RNPurchasesUI native module not available (likely Expo Go / missing rebuild)");
      Alert.alert(copy.title, copy.ctaHint);
      return;
    }
    try {
      // react-native-purchases-ui liefert keine Default-Exports – nutze Namespace-Import.
      const RevenueCatUI = await import("react-native-purchases-ui");
      const present =
        RevenueCatUI.presentPaywallIfNeeded ?? RevenueCatUI.presentPaywall ?? (RevenueCatUI as any)?.default;
      if (typeof present === "function") {
        await present({ requiredEntitlementIdentifier: RC_ENTITLEMENT_ID });
      } else {
        throw new Error("presentPaywallIfNeeded not available");
      }
    } catch (err) {
      console.warn("[Paywall] failed to present", err);
      Alert.alert(copy.title, copy.ctaHint);
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
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.primary} onPress={handleUpgrade}>
            <LinearGradient
              colors={[PALETTE.gold, "#8b6c2a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryInner}
            >
              <Text style={styles.primaryText}>{copy.cta}</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryText}>{copy.later}</Text>
          </Pressable>
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
    paddingBottom: 140,
    gap: 12
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
  primaryInner: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  secondary: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.32)"
  },
  secondaryText: {
    color: PALETTE.sand,
    fontSize: 15,
    fontWeight: "600"
  }
});

export default PremiumUpsellScreen;
