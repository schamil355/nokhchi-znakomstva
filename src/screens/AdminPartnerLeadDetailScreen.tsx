import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { updatePartnerLeadStatus, type PartnerLeadRecord } from "../services/partnerLeadsService";
import { useNavigation, useRoute } from "@react-navigation/native";

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
  updateError: string;
  labels: {
    company: string;
    contact: string;
    email: string;
    phone: string;
    city: string;
    region: string;
    package: string;
    volume: string;
    notes: string;
    created: string;
    status: string;
    source: string;
    locale: string;
  };
  statuses: Record<"new" | "contacted" | "won" | "lost", string>;
};

const translations: Record<"en" | "de" | "fr" | "ru", Copy> = {
  en: {
    title: "Lead details",
    back: "Back",
    updateError: "Failed to update lead status.",
    labels: {
      company: "Company",
      contact: "Contact",
      email: "Email",
      phone: "Phone",
      city: "City",
      region: "Region",
      package: "Package",
      volume: "Volume",
      notes: "Notes",
      created: "Created",
      status: "Status",
      source: "Source",
      locale: "Locale",
    },
    statuses: {
      new: "New",
      contacted: "Contacted",
      won: "Won",
      lost: "Lost",
    },
  },
  de: {
    title: "Lead-Details",
    back: "Zurueck",
    updateError: "Status konnte nicht aktualisiert werden.",
    labels: {
      company: "Firma",
      contact: "Kontakt",
      email: "E-Mail",
      phone: "Telefon",
      city: "Stadt",
      region: "Region",
      package: "Paket",
      volume: "Volumen",
      notes: "Notizen",
      created: "Erstellt",
      status: "Status",
      source: "Quelle",
      locale: "Sprache",
    },
    statuses: {
      new: "Neu",
      contacted: "Kontaktiert",
      won: "Gewonnen",
      lost: "Verloren",
    },
  },
  fr: {
    title: "Details du lead",
    back: "Retour",
    updateError: "Impossible de mettre a jour le statut.",
    labels: {
      company: "Societe",
      contact: "Contact",
      email: "Email",
      phone: "Telephone",
      city: "Ville",
      region: "Region",
      package: "Offre",
      volume: "Volume",
      notes: "Notes",
      created: "Cree",
      status: "Statut",
      source: "Source",
      locale: "Langue",
    },
    statuses: {
      new: "Nouveau",
      contacted: "Contacte",
      won: "Gagne",
      lost: "Perdu",
    },
  },
  ru: {
    title: "Детали заявки",
    back: "Назад",
    updateError: "Не удалось обновить статус.",
    labels: {
      company: "Компания",
      contact: "Контакт",
      email: "Email",
      phone: "Телефон",
      city: "Город",
      region: "Регион",
      package: "Пакет",
      volume: "Объем",
      notes: "Комментарий",
      created: "Создано",
      status: "Статус",
      source: "Источник",
      locale: "Язык",
    },
    statuses: {
      new: "Новый",
      contacted: "Связались",
      won: "Сделка",
      lost: "Потерян",
    },
  },
};

const STATUS_OPTIONS: Array<"new" | "contacted" | "won" | "lost"> = [
  "new",
  "contacted",
  "won",
  "lost",
];

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatFallback = (value?: string | null) => (value && value.trim().length > 0 ? value : "-");

const AdminPartnerLeadDetailScreen = () => {
  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const lead = route.params?.lead as PartnerLeadRecord | undefined;
  const [current, setCurrent] = useState<PartnerLeadRecord | null>(lead ?? null);
  const [updating, setUpdating] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: "AdminPartnerLeads" }] });
  };

  const handleStatusUpdate = async (status: string) => {
    if (!current || updating) return;
    setUpdating(true);
    try {
      const updated = await updatePartnerLeadStatus(current.id, status);
      setCurrent(updated);
    } catch (err) {
      Alert.alert(copy.updateError);
    } finally {
      setUpdating(false);
    }
  };

  const statusValue = current?.status ?? "new";
  const detailRows = useMemo(() => {
    if (!current) return [];
    return [
      { label: copy.labels.company, value: current.company_name },
      { label: copy.labels.contact, value: current.contact_name },
      { label: copy.labels.email, value: current.email },
      { label: copy.labels.phone, value: current.phone ?? "-" },
      { label: copy.labels.city, value: current.city },
      { label: copy.labels.region, value: current.region ?? "-" },
      { label: copy.labels.package, value: current.package_interest ?? "-" },
      { label: copy.labels.volume, value: current.monthly_volume ?? "-" },
      { label: copy.labels.source, value: current.source ?? "-" },
      { label: copy.labels.locale, value: current.locale ?? "-" },
      { label: copy.labels.created, value: formatDate(current.created_at) },
      { label: copy.labels.notes, value: current.notes ?? "-" },
    ];
  }, [copy.labels, current]);

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
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!current ? (
            <View style={styles.card}>
              <Text style={styles.muted}>Lead not found.</Text>
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.company}>{formatFallback(current.company_name)}</Text>
                <View style={styles.statusRow}>
                  <Text style={styles.label}>{copy.labels.status}</Text>
                  <View style={styles.statusPills}>
                    {STATUS_OPTIONS.map((status) => {
                      const active = statusValue === status;
                      return (
                        <Pressable
                          key={status}
                          style={[styles.statusPill, active && styles.statusPillActive]}
                          onPress={() => handleStatusUpdate(status)}
                          disabled={updating}
                        >
                          <Text style={[styles.statusText, active && styles.statusTextActive]}>
                            {copy.statuses[status]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                {detailRows.map((row) => (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={styles.label}>{row.label}</Text>
                    <Text style={styles.value}>{formatFallback(row.value)}</Text>
                  </View>
                ))}
              </View>
            </>
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
  headerTitle: {
    color: PALETTE.sand,
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.border,
    gap: 12,
  },
  company: {
    color: PALETTE.sand,
    fontSize: 18,
    fontWeight: "700",
  },
  muted: {
    color: PALETTE.muted,
  },
  detailRow: {
    gap: 4,
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
  statusRow: {
    gap: 6,
  },
  statusPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  statusPillActive: {
    backgroundColor: "rgba(217,192,143,0.22)",
    borderColor: "rgba(217,192,143,0.8)",
  },
  statusText: {
    color: PALETTE.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextActive: {
    color: PALETTE.sand,
  },
});

export default AdminPartnerLeadDetailScreen;
