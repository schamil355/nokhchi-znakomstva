import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import SafeAreaView from "../components/SafeAreaView";
import { useAuthStore } from "../state/authStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { fetchPlansForUser, respondToInvite } from "../services/planService";
import type { DatePlan, PlanInvite } from "../types";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const translations = {
  en: {
    title: "Plans",
    create: "Create plan",
    yourPlans: "Your plans",
    invites: "Invites",
    emptyPlans: "No plans yet. Create your first date plan.",
    emptyInvites: "No invites yet.",
    view: "View",
    accept: "Accept",
    pass: "Pass",
    creatorFallback: "Someone",
    status: {
      draft: "Draft",
      published: "Published",
      cancelled: "Cancelled",
      completed: "Completed",
      pending: "Pending",
      accepted: "Accepted",
      passed: "Passed"
    },
    errors: {
      load: "Unable to load plans.",
      action: "Action failed. Please try again."
    }
  },
  de: {
    title: "Pläne",
    create: "Plan erstellen",
    yourPlans: "Deine Pläne",
    invites: "Einladungen",
    emptyPlans: "Noch keine Pläne. Erstelle dein erstes Date.",
    emptyInvites: "Keine Einladungen.",
    view: "Ansehen",
    accept: "Annehmen",
    pass: "Ablehnen",
    creatorFallback: "Jemand",
    status: {
      draft: "Entwurf",
      published: "Veröffentlicht",
      cancelled: "Abgesagt",
      completed: "Abgeschlossen",
      pending: "Ausstehend",
      accepted: "Angenommen",
      passed: "Abgelehnt"
    },
    errors: {
      load: "Pläne konnten nicht geladen werden.",
      action: "Aktion fehlgeschlagen. Bitte erneut versuchen."
    }
  },
  fr: {
    title: "Plans",
    create: "Créer un plan",
    yourPlans: "Tes plans",
    invites: "Invitations",
    emptyPlans: "Aucun plan pour l'instant. Crée ton premier rendez-vous.",
    emptyInvites: "Aucune invitation.",
    view: "Voir",
    accept: "Accepter",
    pass: "Passer",
    creatorFallback: "Quelqu'un",
    status: {
      draft: "Brouillon",
      published: "Publié",
      cancelled: "Annulé",
      completed: "Terminé",
      pending: "En attente",
      accepted: "Accepté",
      passed: "Refusé"
    },
    errors: {
      load: "Impossible de charger les plans.",
      action: "Action échouée. Réessaie."
    }
  },
  ru: {
    title: "Планы",
    create: "Создать план",
    yourPlans: "Твои планы",
    invites: "Приглашения",
    emptyPlans: "Планов пока нет. Создай первое свидание.",
    emptyInvites: "Пока нет приглашений.",
    view: "Открыть",
    accept: "Принять",
    pass: "Отклонить",
    creatorFallback: "Кто-то",
    status: {
      draft: "Черновик",
      published: "Опубликован",
      cancelled: "Отменён",
      completed: "Завершён",
      pending: "В ожидании",
      accepted: "Принято",
      passed: "Отклонено"
    },
    errors: {
      load: "Не удалось загрузить планы.",
      action: "Не удалось выполнить действие. Попробуй снова."
    }
  }
};

type PlanCardProps = {
  plan: DatePlan;
  subtitle?: string;
  statusLabel: string;
  onPress: () => void;
  actions?: React.ReactNode;
};

const PlanCard = ({ plan, subtitle, statusLabel, onPress, actions }: PlanCardProps) => {
  const start = new Date(plan.startTime);
  const end = new Date(plan.endTime);
  const timeLabel = `${start.toLocaleDateString()} • ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} → ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{plan.dateType}</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>{timeLabel}</Text>
      <Text style={styles.cardMeta}>{plan.areaLabel}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {actions ? <View style={styles.cardActions}>{actions}</View> : null}
    </Pressable>
  );
};

const PlansScreen = () => {
  const copy = useLocalizedCopy(translations);
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user?.id ?? "";
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["plans", userId],
    queryFn: () => fetchPlansForUser(userId),
    enabled: Boolean(userId)
  });

  const handleInviteAction = async (invite: PlanInvite, status: "accepted" | "passed") => {
    if (pendingInviteId) {
      return;
    }
    setPendingInviteId(invite.id);
    try {
      await respondToInvite(invite.id, status);
      await queryClient.invalidateQueries({ queryKey: ["plans", userId] });
    } catch (error) {
      Alert.alert(copy.errors.action);
    } finally {
      setPendingInviteId(null);
    }
  };

  const data = plansQuery.data;
  const invitedPlans = data?.invitedPlans ?? [];
  const ownPlans = data?.ownPlans ?? [];
  const invites = data?.invites ?? [];
  const creatorNames = data?.creatorNames ?? new Map<string, string>();

  const inviteByPlan = useMemo(() => {
    const map = new Map<string, PlanInvite>();
    invites.forEach((invite) => map.set(invite.planId, invite));
    return map;
  }, [invites]);

  const handleCreate = () => {
    navigation.navigate("PlanCreate");
  };

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Text style={styles.title}>{copy.title}</Text>
          <Pressable onPress={handleCreate} style={({ pressed }) => [styles.createButton, pressed && styles.createButtonPressed]}>
            <Ionicons name="add" size={18} color={PALETTE.deep} />
            <Text style={styles.createButtonText}>{copy.create}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              tintColor={PALETTE.gold}
              refreshing={plansQuery.isRefetching}
              onRefresh={() => plansQuery.refetch()}
            />
          }
        >
          {plansQuery.isLoading ? (
            <ActivityIndicator color={PALETTE.gold} style={styles.loader} />
          ) : plansQuery.isError ? (
            <Text style={styles.emptyText}>{copy.errors.load}</Text>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{copy.yourPlans}</Text>
              {ownPlans.length ? (
                ownPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    statusLabel={copy.status[plan.status] ?? plan.status}
                    onPress={() => navigation.navigate("PlanDetail", { planId: plan.id })}
                    actions={
                      <Pressable style={styles.inlineAction} onPress={() => navigation.navigate("PlanDetail", { planId: plan.id })}>
                        <Text style={styles.inlineActionText}>{copy.view}</Text>
                      </Pressable>
                    }
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>{copy.emptyPlans}</Text>
              )}

              <Text style={styles.sectionTitle}>{copy.invites}</Text>
              {invitedPlans.length ? (
                invitedPlans.map((plan) => {
                  const invite = inviteByPlan.get(plan.id);
                  const creatorName = creatorNames.get(plan.creatorId) ?? copy.creatorFallback;
                  const statusLabel = invite ? copy.status[invite.status] ?? invite.status : copy.status.pending;
                  const isProcessing = Boolean(invite && pendingInviteId === invite.id);
                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      statusLabel={statusLabel}
                      subtitle={`${creatorName}`}
                      onPress={() => navigation.navigate("PlanDetail", { planId: plan.id })}
                      actions={
                        invite?.status === "pending" ? (
                          <View style={styles.inviteActions}>
                            <Pressable
                              style={({ pressed }) => [styles.acceptButton, pressed && styles.acceptButtonPressed]}
                              onPress={() => handleInviteAction(invite, "accepted")}
                              disabled={isProcessing}
                            >
                              <Text style={styles.acceptText}>{copy.accept}</Text>
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [styles.passButton, pressed && styles.passButtonPressed]}
                              onPress={() => handleInviteAction(invite, "passed")}
                              disabled={isProcessing}
                            >
                              <Text style={styles.passText}>{copy.pass}</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable style={styles.inlineAction} onPress={() => navigation.navigate("PlanDetail", { planId: plan.id })}>
                            <Text style={styles.inlineActionText}>{copy.view}</Text>
                          </Pressable>
                        )
                      }
                    />
                  );
                })
              ) : (
                <Text style={styles.emptyText}>{copy.emptyInvites}</Text>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: PALETTE.sand
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.gold
  },
  createButtonPressed: {
    opacity: 0.85
  },
  createButtonText: {
    color: PALETTE.deep,
    fontWeight: "700",
    fontSize: 13
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  loader: {
    marginTop: 20
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: PALETTE.gold,
    fontSize: 16,
    fontWeight: "700"
  },
  emptyText: {
    color: "rgba(242, 231, 215, 0.75)",
    fontSize: 14,
    marginBottom: 12
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.25)",
    marginBottom: 12
  },
  cardPressed: {
    opacity: 0.85
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  cardTitle: {
    color: PALETTE.sand,
    fontSize: 16,
    fontWeight: "700"
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(217, 192, 143, 0.2)"
  },
  statusText: {
    color: PALETTE.gold,
    fontSize: 12,
    fontWeight: "600"
  },
  cardMeta: {
    color: "rgba(242, 231, 215, 0.8)",
    fontSize: 13
  },
  cardSubtitle: {
    marginTop: 6,
    color: "rgba(242, 231, 215, 0.65)",
    fontSize: 12
  },
  cardActions: {
    marginTop: 12
  },
  inlineAction: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.4)"
  },
  inlineActionText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 12
  },
  inviteActions: {
    flexDirection: "row",
    gap: 10
  },
  acceptButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.gold
  },
  acceptButtonPressed: {
    opacity: 0.85
  },
  acceptText: {
    color: PALETTE.deep,
    fontWeight: "700",
    fontSize: 12
  },
  passButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.4)"
  },
  passButtonPressed: {
    opacity: 0.75
  },
  passText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 12
  }
});

export default PlansScreen;
