import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { fetchPartnerLeads, type PartnerLeadRecord } from "../services/partnerLeadsService";
import { useNavigation } from "@react-navigation/native";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  base: "#0b1a12",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  card: "rgba(11,31,22,0.85)",
  border: "rgba(217,192,143,0.35)",
  muted: "rgba(242,231,215,0.75)",
  danger: "#f2b4ae",
};

type Copy = {
  title: string;
  back: string;
  refresh: string;
  loading: string;
  empty: string;
  error: string;
  labels: {
    company: string;
    contact: string;
    email: string;
    phone: string;
    city: string;
    package: string;
    volume: string;
    notes: string;
    created: string;
  };
};

const translations: Record<"en" | "de" | "fr" | "ru", Copy> = {
  en: {
    title: "Partner leads",
    back: "Back",
    refresh: "Refresh",
    loading: "Loading leads...",
    empty: "No leads yet.",
    error: "Failed to load leads.",
    labels: {
      company: "Company",
      contact: "Contact",
      email: "Email",
      phone: "Phone",
      city: "City",
      package: "Package",
      volume: "Volume",
      notes: "Notes",
      created: "Created",
    },
  },
  de: {
    title: "Partner-Anfragen",
    back: "Zurueck",
    refresh: "Aktualisieren",
    loading: "Anfragen werden geladen...",
    empty: "Keine Anfragen vorhanden.",
    error: "Anfragen konnten nicht geladen werden.",
    labels: {
      company: "Firma",
      contact: "Kontakt",
      email: "E-Mail",
      phone: "Telefon",
      city: "Stadt",
      package: "Paket",
      volume: "Volumen",
      notes: "Notizen",
      created: "Erstellt",
    },
  },
  fr: {
    title: "Leads partenaires",
    back: "Retour",
    refresh: "Actualiser",
    loading: "Chargement des leads...",
    empty: "Aucun lead pour le moment.",
    error: "Impossible de charger les leads.",
    labels: {
      company: "Societe",
      contact: "Contact",
      email: "Email",
      phone: "Telephone",
      city: "Ville",
      package: "Offre",
      volume: "Volume",
      notes: "Notes",
      created: "Cree",
    },
  },
  ru: {
    title: "Заявки партнеров",
    back: "Назад",
    refresh: "Обновить",
    loading: "Загрузка заявок...",
    empty: "Пока нет заявок.",
    error: "Не удалось загрузить заявки.",
    labels: {
      company: "Компания",
      contact: "Контакт",
      email: "Email",
      phone: "Телефон",
      city: "Город",
      package: "Пакет",
      volume: "Объем",
      notes: "Комментарий",
      created: "Создано",
    },
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatFallback = (value?: string | null) => (value && value.trim().length > 0 ? value : "-");

const AdminPartnerLeadsScreen = () => {
  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();
  const [leads, setLeads] = useState<PartnerLeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPartnerLeads({ limit: 100, offset: 0 });
      setLeads(response.items ?? []);
    } catch (err) {
      setError(copy.error);
    } finally {
      setLoading(false);
    }
  }, [copy.error]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "Settings" }] });
  };

  const headerMeta = useMemo(() => {
    if (loading) return copy.loading;
    if (error) return error;
    return `${leads.length}`;
  }, [copy.loading, error, leads.length, loading]);

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, PALETTE.base]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={handleBack} accessibilityRole="button">
            <Ionicons name="chevron-back" size={22} color={PALETTE.sand} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{copy.title}</Text>
            <Text style={styles.headerMeta}>{headerMeta}</Text>
          </View>
          <Pressable style={styles.headerButton} onPress={loadLeads} accessibilityRole="button">
            <Ionicons name="refresh" size={20} color={PALETTE.sand} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={PALETTE.gold} />
              <Text style={styles.stateText}>{copy.loading}</Text>
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={[styles.stateText, styles.errorText]}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={loadLeads}>
                <Text style={styles.retryText}>{copy.refresh}</Text>
              </Pressable>
            </View>
          ) : leads.length === 0 ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateText}>{copy.empty}</Text>
            </View>
          ) : (
            leads.map((lead) => (
              <View key={lead.id} style={styles.card}>
                <Text style={styles.company}>{formatFallback(lead.company_name)}</Text>
                <Text style={styles.metaLine}>
                  {copy.labels.created}: {formatDate(lead.created_at)}
                </Text>
                <View style={styles.detailGrid}>
                  <Text style={styles.label}>{copy.labels.contact}</Text>
                  <Text style={styles.value}>{formatFallback(lead.contact_name)}</Text>

                  <Text style={styles.label}>{copy.labels.email}</Text>
                  <Text style={styles.value}>{formatFallback(lead.email)}</Text>

                  <Text style={styles.label}>{copy.labels.phone}</Text>
                  <Text style={styles.value}>{formatFallback(lead.phone ?? "")}</Text>

                  <Text style={styles.label}>{copy.labels.city}</Text>
                  <Text style={styles.value}>{formatFallback(lead.city)}</Text>

                  <Text style={styles.label}>{copy.labels.package}</Text>
                  <Text style={styles.value}>{formatFallback(lead.package_interest ?? "")}</Text>

                  <Text style={styles.label}>{copy.labels.volume}</Text>
                  <Text style={styles.value}>{formatFallback(lead.monthly_volume ?? "")}</Text>

                  <Text style={styles.label}>{copy.labels.notes}</Text>
                  <Text style={styles.value}>{formatFallback(lead.notes ?? "")}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 10,
    paddingTop: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    color: PALETTE.sand,
    fontSize: 18,
    fontWeight: "700",
  },
  headerMeta: {
    color: PALETTE.muted,
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  stateBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  stateText: {
    color: PALETTE.muted,
    textAlign: "center",
  },
  errorText: {
    color: PALETTE.danger,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    color: PALETTE.sand,
    fontWeight: "600",
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 10,
  },
  company: {
    color: PALETTE.sand,
    fontSize: 16,
    fontWeight: "700",
  },
  metaLine: {
    color: PALETTE.muted,
    fontSize: 12,
  },
  detailGrid: {
    marginTop: 6,
    gap: 6,
  },
  label: {
    color: "rgba(242,231,215,0.6)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    color: PALETTE.sand,
    fontSize: 14,
  },
});

export default AdminPartnerLeadsScreen;
