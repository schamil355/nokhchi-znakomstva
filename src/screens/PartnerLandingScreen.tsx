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
  highlight: string;
};

type Copy = {
  title: string;
  subtitle: string;
  valueTitle: string;
  values: string[];
  plansTitle: string;
  plans: Plan[];
  ctaPrimary: string;
  ctaSecondary: string;
  back: string;
};

const translations: Record<"en" | "de" | "fr" | "ru", Copy> = {
  en: {
    title: "Partner program",
    subtitle: "Monetize via commission on paid orders. Simple, transparent, scalable.",
    valueTitle: "Why partners choose this model",
    values: [
      "Revenue share per paid order (15-25%)",
      "Works best with 15 000 - 40 000 basket value",
      "Optional featured placement + exclusivity"
    ],
    plansTitle: "Packages at a glance",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / month",
        highlight: "20% commission per order"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / month",
        highlight: "15% commission + Featured"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / month",
        highlight: "10% + city exclusivity"
      }
    ],
    ctaPrimary: "Become a partner",
    ctaSecondary: "View packages",
    back: "Back"
  },
  de: {
    title: "Partnerprogramm",
    subtitle: "Monetarisierung per Provision auf bezahlte Orders. Einfach, transparent, skalierbar.",
    valueTitle: "Warum Haendler dieses Modell moegen",
    values: [
      "Revenue Share pro bezahlter Bestellung (15-25%)",
      "Ideal bei 15 000 - 40 000 Bestellwert",
      "Optional: Featured Placement + Exklusivitaet"
    ],
    plansTitle: "Pakete im Ueberblick",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / Monat",
        highlight: "20% Provision pro Order"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / Monat",
        highlight: "15% Provision + Featured"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / Monat",
        highlight: "10% + Exklusiv pro Stadt"
      }
    ],
    ctaPrimary: "Partner werden",
    ctaSecondary: "Pakete ansehen",
    back: "Zurueck"
  },
  fr: {
    title: "Programme partenaire",
    subtitle: "Monetisez via une commission sur les commandes payees. Simple et scalable.",
    valueTitle: "Pourquoi ce modele fonctionne",
    values: [
      "Revenue share par commande payee (15-25%)",
      "Ideal avec un panier de 15 000 - 40 000",
      "Option: mise en avant + exclusivite"
    ],
    plansTitle: "Offres en bref",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / mois",
        highlight: "20% de commission"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / mois",
        highlight: "15% + mise en avant"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / mois",
        highlight: "10% + exclusivite"
      }
    ],
    ctaPrimary: "Devenir partenaire",
    ctaSecondary: "Voir les offres",
    back: "Retour"
  },
  ru: {
    title: "Partner program",
    subtitle: "Monetize via commission on paid orders. Simple, transparent, scalable.",
    valueTitle: "Why partners choose this model",
    values: [
      "Revenue share per paid order (15-25%)",
      "Works best with 15 000 - 40 000 basket value",
      "Optional featured placement + exclusivity"
    ],
    plansTitle: "Packages at a glance",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "0 / month",
        highlight: "20% commission per order"
      },
      {
        id: "pro",
        name: "Pro",
        price: "20 000 RUB / month",
        highlight: "15% commission + Featured"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "50 000 RUB / month",
        highlight: "10% + city exclusivity"
      }
    ],
    ctaPrimary: "Become a partner",
    ctaSecondary: "View packages",
    back: "Back"
  }
};

const PartnerLandingScreen = () => {
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backBtn} onPress={handleBack} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={PALETTE.gold} />
            <Text style={styles.backText}>{copy.back}</Text>
          </Pressable>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{copy.valueTitle}</Text>
            {copy.values.map((value) => (
              <View key={value} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.cardText}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{copy.plansTitle}</Text>
          </View>

          <View style={styles.planGrid}>
            {copy.plans.map((plan) => (
              <View key={plan.id} style={styles.planCard}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price}</Text>
                <Text style={styles.planHighlight}>{plan.highlight}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => navigation.navigate("PartnerPricing")}
            >
              <Text style={styles.secondaryButtonText}>{copy.ctaSecondary}</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate("PartnerApply")}
            >
              <LinearGradient
                colors={[PALETTE.gold, "#8b6c2a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonInner}
              >
                <Text style={styles.primaryButtonText}>{copy.ctaPrimary}</Text>
              </LinearGradient>
            </Pressable>
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
    gap: 18,
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
    fontSize: 30,
    fontWeight: "700",
    color: PALETTE.sand
  },
  subtitle: {
    color: "rgba(242,231,215,0.8)",
    fontSize: 16,
    lineHeight: 22
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: PALETTE.border
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PALETTE.sand,
    marginBottom: 10
  },
  cardText: {
    color: "rgba(242,231,215,0.85)",
    fontSize: 14,
    flex: 1
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.gold,
    marginTop: 6
  },
  sectionHeader: {
    marginTop: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PALETTE.sand
  },
  planGrid: {
    gap: 12
  },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.25)"
  },
  planName: {
    color: PALETTE.sand,
    fontWeight: "700",
    fontSize: 16
  },
  planPrice: {
    color: PALETTE.gold,
    fontWeight: "600",
    marginTop: 6
  },
  planHighlight: {
    color: "rgba(242,231,215,0.8)",
    marginTop: 6
  },
  ctaRow: {
    gap: 12,
    marginTop: 4
  },
  primaryButton: {
    borderRadius: 28,
    overflow: "hidden"
  },
  primaryButtonInner: {
    paddingVertical: 14,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#1a1a1a",
    fontWeight: "700"
  },
  secondaryButton: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: PALETTE.border,
    paddingVertical: 14,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: PALETTE.sand,
    fontWeight: "600"
  }
});

export default PartnerLandingScreen;
