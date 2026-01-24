import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import SafeAreaView from "../components/SafeAreaView";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { fetchPartnerLeads, updatePartnerLeadStatus, type PartnerLeadRecord } from "../services/partnerLeadsService";
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
  export: string;
  filterAll: string;
  detail: string;
  loading: string;
  empty: string;
  error: string;
  updateError: string;
  exportEmpty: string;
  exportUnsupported: string;
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
    status: string;
  };
  statuses: Record<"new" | "contacted" | "won" | "lost", string>;
};

const translations: Record<"en" | "de" | "fr" | "ru", Copy> = {
  en: {
    title: "Partner leads",
    back: "Back",
    refresh: "Refresh",
    export: "Export CSV",
    filterAll: "All",
    detail: "Details",
    loading: "Loading leads...",
    empty: "No leads yet.",
    error: "Failed to load leads.",
    updateError: "Failed to update lead status.",
    exportEmpty: "No leads to export.",
    exportUnsupported: "Export is available on the web.",
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
      status: "Status",
    },
    statuses: {
      new: "New",
      contacted: "Contacted",
      won: "Won",
      lost: "Lost",
    },
  },
  de: {
    title: "Partner-Anfragen",
    back: "Zurueck",
    refresh: "Aktualisieren",
    export: "CSV exportieren",
    filterAll: "Alle",
    detail: "Details",
    loading: "Anfragen werden geladen...",
    empty: "Keine Anfragen vorhanden.",
    error: "Anfragen konnten nicht geladen werden.",
    updateError: "Status konnte nicht aktualisiert werden.",
    exportEmpty: "Keine Anfragen zum Export.",
    exportUnsupported: "Export ist nur im Web verfuegbar.",
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
      status: "Status",
    },
    statuses: {
      new: "Neu",
      contacted: "Kontaktiert",
      won: "Gewonnen",
      lost: "Verloren",
    },
  },
  fr: {
    title: "Leads partenaires",
    back: "Retour",
    refresh: "Actualiser",
    export: "Exporter CSV",
    filterAll: "Tous",
    detail: "Details",
    loading: "Chargement des leads...",
    empty: "Aucun lead pour le moment.",
    error: "Impossible de charger les leads.",
    updateError: "Impossible de mettre a jour le statut.",
    exportEmpty: "Aucun lead a exporter.",
    exportUnsupported: "Export disponible uniquement sur le web.",
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
      status: "Statut",
    },
    statuses: {
      new: "Nouveau",
      contacted: "Contacte",
      won: "Gagne",
      lost: "Perdu",
    },
  },
  ru: {
    title: "Заявки партнеров",
    back: "Назад",
    refresh: "Обновить",
    export: "Экспорт CSV",
    filterAll: "Все",
    detail: "Детали",
    loading: "Загрузка заявок...",
    empty: "Пока нет заявок.",
    error: "Не удалось загрузить заявки.",
    updateError: "Не удалось обновить статус.",
    exportEmpty: "Нет заявок для экспорта.",
    exportUnsupported: "Экспорт доступен только в веб-версии.",
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
      status: "Статус",
    },
    statuses: {
      new: "Новый",
      contacted: "Связались",
      won: "Сделка",
      lost: "Потерян",
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

const STATUS_OPTIONS: Array<"new" | "contacted" | "won" | "lost"> = [
  "new",
  "contacted",
  "won",
  "lost",
];

const toCsvValue = (value?: string | null) =>
  `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

const AdminPartnerLeadsScreen = () => {
  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();
  const [leads, setLeads] = useState<PartnerLeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "contacted" | "won" | "lost">("all");

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

  const handleExportCsv = () => {
    if (Platform.OS !== "web") {
      Alert.alert(copy.exportUnsupported);
      return;
    }
    const exportList = filteredLeads;
    if (!exportList.length) {
      Alert.alert(copy.exportEmpty);
      return;
    }
    const headers = [
      "id",
      "created_at",
      "company_name",
      "contact_name",
      "email",
      "phone",
      "city",
      "region",
      "package_interest",
      "monthly_volume",
      "status",
      "source",
      "locale",
      "notes",
    ];
    const rows = exportList.map((lead) =>
      [
        lead.id,
        lead.created_at,
        lead.company_name,
        lead.contact_name,
        lead.email,
        lead.phone ?? "",
        lead.city,
        lead.region ?? "",
        lead.package_interest ?? "",
        lead.monthly_volume ?? "",
        lead.status ?? "",
        lead.source ?? "",
        lead.locale ?? "",
        lead.notes ?? "",
      ]
        .map(toCsvValue)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.href = url;
    link.download = `partner-leads-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleStatusUpdate = async (leadId: string, status: string) => {
    if (updatingId) return;
    setUpdatingId(leadId);
    try {
      const updated = await updatePartnerLeadStatus(leadId, status);
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: updated.status ?? status } : lead
        )
      );
    } catch (err) {
      Alert.alert(copy.updateError);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") return leads;
    return leads.filter((lead) => (lead.status ?? "new") === statusFilter);
  }, [leads, statusFilter]);

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
          <View style={styles.headerActions}>
            <Pressable style={styles.headerButton} onPress={handleExportCsv} accessibilityRole="button">
              <Ionicons name="download-outline" size={20} color={PALETTE.sand} />
            </Pressable>
            <Pressable style={styles.headerButton} onPress={loadLeads} accessibilityRole="button">
              <Ionicons name="refresh" size={20} color={PALETTE.sand} />
            </Pressable>
          </View>
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
          ) : filteredLeads.length === 0 ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateText}>{copy.empty}</Text>
            </View>
          ) : (
            <>
              <View style={styles.filterRow}>
                <Pressable
                  style={[
                    styles.filterPill,
                    statusFilter === "all" && styles.filterPillActive,
                  ]}
                  onPress={() => setStatusFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      statusFilter === "all" && styles.filterTextActive,
                    ]}
                  >
                    {copy.filterAll}
                  </Text>
                </Pressable>
                {STATUS_OPTIONS.map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.filterPill,
                      statusFilter === status && styles.filterPillActive,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        statusFilter === status && styles.filterTextActive,
                      ]}
                    >
                      {copy.statuses[status]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {filteredLeads.map((lead) => (
              <View key={lead.id} style={styles.card}>
                <Text style={styles.company}>{formatFallback(lead.company_name)}</Text>
                <Text style={styles.metaLine}>
                  {copy.labels.created}: {formatDate(lead.created_at)}
                </Text>
                <View style={styles.statusRow}>
                  <Text style={styles.label}>{copy.labels.status}</Text>
                  <View style={styles.statusPills}>
                    {STATUS_OPTIONS.map((status) => {
                      const active = (lead.status ?? "new") === status;
                      return (
                        <Pressable
                          key={status}
                          style={[styles.statusPill, active && styles.statusPillActive]}
                          onPress={() => handleStatusUpdate(lead.id, status)}
                          disabled={updatingId === lead.id}
                        >
                          <Text style={[styles.statusText, active && styles.statusTextActive]}>
                            {copy.statuses[status]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                <Pressable
                  style={styles.detailButton}
                  onPress={() => navigation.navigate("AdminPartnerLeadDetail", { lead })}
                >
                  <Text style={styles.detailText}>{copy.detail}</Text>
                </Pressable>
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
              ))}
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PALETTE.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  filterPillActive: {
    backgroundColor: "rgba(217,192,143,0.22)",
    borderColor: "rgba(217,192,143,0.8)",
  },
  filterText: {
    color: PALETTE.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  filterTextActive: {
    color: PALETTE.sand,
  },
  statusRow: {
    marginTop: 8,
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
  detailButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 12,
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
