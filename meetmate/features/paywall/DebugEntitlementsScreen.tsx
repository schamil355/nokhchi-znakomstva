import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getSupabase } from "../../lib/supabase";
import { useSessionStore } from "../../store/sessionStore";
import { useToast } from "../../components/ToastProvider";

type ActiveEntitlement = {
  id: string;
  user_id: string;
  product_id: string;
  source: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, unknown> | null;
};

type EntitlementEvent = {
  id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown> | null;
  entitlement?: {
    product_id: string;
    source: string;
    user_id: string;
  } | null;
};

const formatRemainingTime = (iso: string | null) => {
  if (!iso) {
    return "Kein Enddatum";
  }
  const end = new Date(iso).getTime();
  const now = Date.now();
  const diff = end - now;
  if (Number.isNaN(end)) {
    return "Ungültiges Datum";
  }
  if (diff <= 0) {
    return "Abgelaufen";
  }
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const buildDevWebhookUrl = (supabaseUrl: string | undefined) => {
  if (!supabaseUrl) {
    return null;
  }
  try {
    return new URL("/functions/v1/psp/webhook/dev-simulate", supabaseUrl).toString();
  } catch {
    return null;
  }
};

const DebugEntitlementsScreen = (): JSX.Element => {
  const session = useSessionStore((state) => state.session);
  const { showToast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  const supabase = useMemo(() => getSupabase(), []);
  const userId = session?.user.id;

  const entitlementsQuery = useQuery({
    queryKey: ["debug-active-entitlements", userId],
    enabled: Boolean(userId) && __DEV__,
    queryFn: async () => {
      const { data, error } = await supabase
        .from<ActiveEntitlement>("active_entitlements_v")
        .select("*")
        .eq("user_id", userId);
      if (error) {
        throw error;
      }
      return data ?? [];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["debug-entitlement-events", userId],
    enabled: Boolean(userId) && __DEV__,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entitlement_events")
        .select(
          "id, event_type, created_at, payload, entitlement:entitlements!inner(product_id, source, user_id)",
        )
        .eq("entitlement.user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        throw error;
      }
      return (data ?? []) as EntitlementEvent[];
    },
  });

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const devWebhookUrl = buildDevWebhookUrl(supabaseUrl);
  const canSimulate =
    __DEV__ &&
    !!userId &&
    !!devWebhookUrl &&
    (devWebhookUrl.includes("localhost") || devWebhookUrl.includes("127.0.0.1"));

  const handleSimulateSubscription = async () => {
    if (!canSimulate || !userId || !devWebhookUrl) {
      showToast("Simulation nur im lokalen Dev-Modus verfügbar.", "info");
      return;
    }
    setIsSimulating(true);
    try {
      const payload = {
        user_id: userId,
        product_id: "debug_pro_monthly",
        status: "active",
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tx_id: `dev-${Date.now()}`,
      };
      const response = await fetch(devWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }
      await entitlementsQuery.refetch();
      await eventsQuery.refetch();
      showToast("Dev-Abo simuliert.", "success");
    } catch (error: any) {
      showToast(error?.message ?? "Simulation fehlgeschlagen.", "error");
    } finally {
      setIsSimulating(false);
    }
  };

  if (!__DEV__) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>
          Dieser Bereich ist nur in Entwicklungs-Builds verfügbar.
        </Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>Keine aktive Session gefunden.</Text>
      </View>
    );
  }

  const activeEntitlements = entitlementsQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      testID="debug-entitlements-screen"
    >
      <Text style={styles.title}>Debug Entitlements</Text>

      <View style={styles.section} testID="debug-active-section">
        <Text style={styles.sectionTitle}>
          Aktive Entitlements ({activeEntitlements.length})
        </Text>
        {entitlementsQuery.isLoading ? (
          <ActivityIndicator />
        ) : activeEntitlements.length === 0 ? (
          <Text style={styles.infoText}>Keine aktiven Entitlements gefunden.</Text>
        ) : (
          activeEntitlements.map((item) => (
            <View key={item.id} style={styles.card} testID="debug-active-item">
              <Text style={styles.cardTitle}>{item.product_id}</Text>
              <Text style={styles.cardMeta}>Quelle: {item.source}</Text>
              <Text style={styles.cardMeta}>Status: {item.status}</Text>
              <Text style={styles.cardMeta}>Start: {item.period_start ?? "—"}</Text>
              <Text style={styles.cardMeta}>Ende: {item.period_end ?? "—"}</Text>
              <Text style={styles.cardMeta}>
                Zeit bis Ablauf: {formatRemainingTime(item.period_end)}
              </Text>
              {item.metadata ? (
                <Text style={styles.cardJson}>
                  {JSON.stringify(item.metadata, null, 2)}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.section} testID="debug-events-section">
        <Text style={styles.sectionTitle}>Letzte Events</Text>
        {eventsQuery.isLoading ? (
          <ActivityIndicator />
        ) : events.length === 0 ? (
          <Text style={styles.infoText}>Keine Events gefunden.</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.card} testID="debug-event-item">
              <Text style={styles.cardTitle}>
                {event.event_type} · {event.created_at}
              </Text>
              <Text style={styles.cardMeta}>
                Produkt: {event.entitlement?.product_id ?? "?"} (
                {event.entitlement?.source ?? "?"})
              </Text>
              <Text style={styles.cardJson}>
                {JSON.stringify(event.payload ?? {}, null, 2)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Pressable
        style={[styles.button, (!canSimulate || isSimulating) && styles.buttonDisabled]}
        onPress={handleSimulateSubscription}
        disabled={!canSimulate || isSimulating}
        testID="debug-simulate-button"
      >
        {isSimulating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Simuliere Web-Abo (DEV)</Text>
        )}
      </Pressable>
      {!canSimulate ? (
        <Text style={styles.infoText}>
          Hinweis: Simulation benötigt lokale Supabase (localhost:54321).
        </Text>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardMeta: {
    color: "#4b5563",
    fontSize: 14,
  },
  cardJson: {
    marginTop: 8,
    fontFamily:
      Platform.select({ ios: "Courier", android: "monospace", default: "Courier" }) ??
      "Courier",
    fontSize: 12,
    color: "#1f2937",
  },
  infoText: {
    color: "#6b7280",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default DebugEntitlementsScreen;
