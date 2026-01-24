import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  base: "#0b1a12",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  card: "rgba(11,31,22,0.85)",
  border: "rgba(217,192,143,0.35)"
};

type Plan = {
  id: "starter" | "pro" | "enterprise";
  name: string;
  price: string;
  features: string[];
  cta: string;
};

type Copy = {
  title: string;
  subtitle: string;
  back: string;
  plans: Plan[];
};

const translations: Record<"en" | "de" | "fr" | "ru", Copy> = {
  en: {
    title: "Pricing",
    subtitle: "Simple packages designed for local partners.",
    back: "Back",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / month",
        features: [
          "20% commission per paid order",
          "Standard listing",
          "Monthly reporting"
        ],
        cta: "Apply"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / month",
        features: [
          "15% commission per paid order",
          "Featured placement",
          "Priority reporting"
        ],
        cta: "Apply"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / month",
        features: [
          "10% commission",
          "City exclusivity",
          "SLA + account manager"
        ],
        cta: "Apply"
      }
    ]
  },
  de: {
    title: "Pakete",
    subtitle: "Klar kalkulierbare Pakete fuer lokale Partner.",
    back: "Zurueck",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / Monat",
        features: [
          "20% Provision pro bezahlter Order",
          "Standard-Listing",
          "Monatliches Reporting"
        ],
        cta: "Anfragen"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / Monat",
        features: [
          "15% Provision pro bezahlter Order",
          "Featured Placement",
          "Priorisiertes Reporting"
        ],
        cta: "Anfragen"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / Monat",
        features: [
          "10% Provision",
          "Exklusivitaet pro Stadt",
          "SLA + Account Manager"
        ],
        cta: "Anfragen"
      }
    ]
  },
  fr: {
    title: "Offres",
    subtitle: "Des offres simples pour les partenaires locaux.",
    back: "Retour",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / mois",
        features: [
          "20% de commission par commande payee",
          "Listing standard",
          "Reporting mensuel"
        ],
        cta: "Demander"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / mois",
        features: [
          "15% de commission",
          "Mise en avant",
          "Reporting prioritaire"
        ],
        cta: "Demander"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / mois",
        features: [
          "10% de commission",
          "Exclusivite par ville",
          "SLA + account manager"
        ],
        cta: "Demander"
      }
    ]
  },
  ru: {
    title: "Pricing",
    subtitle: "Simple packages designed for local partners.",
    back: "Back",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / month",
        features: [
          "20% commission per paid order",
          "Standard listing",
          "Monthly reporting"
        ],
        cta: "Apply"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / month",
        features: [
          "15% commission per paid order",
          "Featured placement",
          "Priority reporting"
        ],
        cta: "Apply"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / month",
        features: [
          "10% commission",
          "City exclusivity",
          "SLA + account manager"
        ],
        cta: "Apply"
      }
    ]
  }
};

const PartnerPricingScreen = () => {
  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();
  const session = useAuthStore((state) => state.session);
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: session ? "Main" : "Auth" }]
    });
  };

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, PALETTE.base]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backBtn} onPress={handleBack} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={PALETTE.gold} />
            <Text style={styles.backText}>{copy.back}</Text>
          </Pressable>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.planList}>
            {copy.plans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <View style={styles.featureList}>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={styles.planCta}
                  onPress={() => navigation.navigate("PartnerApply", { plan: plan.id })}
                >
                  <LinearGradient
                    colors={[PALETTE.gold, "#8b6c2a"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.planCtaInner}
                  >
                    <Text style={styles.planCtaText}>{plan.cta}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent"
  },
  gradient: {
    flex: 1
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 40
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  backText: {
    color: PALETTE.gold,
    fontWeight: "600"
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: PALETTE.sand
  },
  subtitle: {
    color: "rgba(242,231,215,0.8)",
    fontSize: 16
  },
  planList: {
    gap: 16
  },
  planCard: {
    backgroundColor: PALETTE.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: PALETTE.border
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.sand
  },
  planPrice: {
    fontSize: 16,
    color: PALETTE.gold,
    marginTop: 6
  },
  featureList: {
    gap: 8,
    marginTop: 12
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.gold,
    marginTop: 6
  },
  featureText: {
    color: "rgba(242,231,215,0.85)",
    fontSize: 14,
    flex: 1
  },
  planCta: {
    marginTop: 16,
    borderRadius: 24,
    overflow: "hidden"
  },
  planCtaInner: {
    paddingVertical: 12,
    alignItems: "center"
  },
  planCtaText: {
    color: "#1a1a1a",
    fontWeight: "700"
  }
});

export default PartnerPricingScreen;
