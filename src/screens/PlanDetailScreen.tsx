import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SafeAreaView from "../components/SafeAreaView";
import { useAuthStore } from "../state/authStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { fetchPlanById, fetchPlanInvites, respondToInvite, sendPlanInvite } from "../services/planService";
import { fetchMatches } from "../services/matchService";
import type { DatePlan, PlanInvite } from "../types";

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  gold: "#d9c08f",
  sand: "#f2e7d7"
};

const translations = {
  en: {
    title: "Plan details",
    details: "Details",
    invites: "Invites",
    inviteMatches: "Invite a match",
    noInvites: "No invites yet.",
    noMatches: "No matches available.",
    accept: "Accept",
    pass: "Pass",
    invite: "Invite",
    invited: "Invited",
    creatorFallback: "Creator",
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
      load: "Failed to load plan.",
      action: "Action failed. Please try again."
    }
  },
  de: {
    title: "Plan-Details",
    details: "Details",
    invites: "Einladungen",
    inviteMatches: "Match einladen",
    noInvites: "Noch keine Einladungen.",
    noMatches: "Keine Matches verfügbar.",
    accept: "Annehmen",
    pass: "Ablehnen",
    invite: "Einladen",
    invited: "Eingeladen",
    creatorFallback: "Ersteller",
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
      load: "Plan konnte nicht geladen werden.",
      action: "Aktion fehlgeschlagen."
    }
  },
  fr: {
    title: "Détails du plan",
    details: "Détails",
    invites: "Invitations",
    inviteMatches: "Inviter un match",
    noInvites: "Aucune invitation pour l'instant.",
    noMatches: "Aucun match disponible.",
    accept: "Accepter",
    pass: "Passer",
    invite: "Inviter",
    invited: "Invité",
    creatorFallback: "Créateur",
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
      load: "Impossible de charger le plan.",
      action: "Action échouée."
    }
  },
  ru: {
    title: "Детали плана",
    details: "Детали",
    invites: "Приглашения",
    inviteMatches: "Пригласить матч",
    noInvites: "Пока нет приглашений.",
    noMatches: "Нет доступных матчей.",
    accept: "Принять",
    pass: "Отклонить",
    invite: "Пригласить",
    invited: "Приглашен",
    creatorFallback: "Создатель",
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
      load: "Не удалось загрузить план.",
      action: "Не удалось выполнить действие."
    }
  }
};

type Props = NativeStackScreenProps<any>;

const formatBudget = (plan: DatePlan) => {
  if (plan.budgetMin && plan.budgetMax) {
    return `${plan.budgetMin} - ${plan.budgetMax}`;
  }
  if (plan.budgetMin) {
    return `${plan.budgetMin}+`;
  }
  if (plan.budgetMax) {
    return `≤ ${plan.budgetMax}`;
  }
  return null;
};

const PlanDetailScreen = ({ navigation, route }: Props) => {
  const copy = useLocalizedCopy(translations);
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user?.id ?? "";
  const planId = route?.params?.planId as string;
  const [actionId, setActionId] = useState<string | null>(null);

  const planQuery = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => fetchPlanById(planId),
    enabled: Boolean(planId)
  });

  const invitesQuery = useQuery({
    queryKey: ["plan-invites", planId],
    queryFn: () => fetchPlanInvites(planId),
    enabled: Boolean(planId)
  });

  const matchesQuery = useQuery({
    queryKey: ["plan-matches", userId],
    queryFn: () => fetchMatches(userId),
    enabled: Boolean(userId) && Boolean(planQuery.data && planQuery.data.creatorId === userId)
  });

  const plan = planQuery.data;
  const invites = invitesQuery.data?.invites ?? [];
  const profileNames = invitesQuery.data?.profileNames ?? new Map<string, string>();

  const inviteeIds = useMemo(() => new Set(invites.map((invite) => invite.toUserId)), [invites]);

  const handleInvite = async (matchUserId: string) => {
    if (!plan || !userId || actionId) {
      return;
    }
    setActionId(matchUserId);
    try {
      await sendPlanInvite({ planId: plan.id, fromUserId: userId, toUserId: matchUserId });
      await invitesQuery.refetch();
    } catch (error) {
      Alert.alert(copy.errors.action);
    } finally {
      setActionId(null);
    }
  };

  const handleRespond = async (invite: PlanInvite, status: "accepted" | "passed") => {
    if (actionId) {
      return;
    }
    setActionId(invite.id);
    try {
      await respondToInvite(invite.id, status);
      await queryClient.invalidateQueries({ queryKey: ["plans", userId] });
      await invitesQuery.refetch();
    } catch (error) {
      Alert.alert(copy.errors.action);
    } finally {
      setActionId(null);
    }
  };

  const budgetLabel = plan ? formatBudget(plan) : null;

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color={PALETTE.gold} />
          </Pressable>
          <Text style={styles.title}>{copy.title}</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {planQuery.isLoading ? (
            <ActivityIndicator color={PALETTE.gold} style={{ marginTop: 20 }} />
          ) : !plan ? (
            <Text style={styles.emptyText}>{copy.errors.load}</Text>
          ) : (
            <>
              <Text style={styles.sectionTitle}>{copy.details}</Text>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{plan.dateType}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{copy.status[plan.status] ?? plan.status}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {new Date(plan.startTime).toLocaleString()} → {new Date(plan.endTime).toLocaleString()}
                </Text>
                <Text style={styles.cardMeta}>{plan.areaLabel}</Text>
                {plan.vibeTags?.length ? (
                  <Text style={styles.cardMeta}>#{plan.vibeTags.join(" #")}</Text>
                ) : null}
                {budgetLabel ? <Text style={styles.cardMeta}>{budgetLabel}</Text> : null}
                {plan.notes ? <Text style={styles.cardNotes}>{plan.notes}</Text> : null}
              </View>

              <Text style={styles.sectionTitle}>{copy.invites}</Text>
              {invitesQuery.isLoading ? (
                <ActivityIndicator color={PALETTE.gold} />
              ) : invites.length ? (
                invites.map((invite) => {
                  const fromName = profileNames.get(invite.fromUserId) ?? copy.creatorFallback;
                  const toName = profileNames.get(invite.toUserId) ?? copy.creatorFallback;
                  const isInvitee = invite.toUserId === userId;
                  const isProcessing = actionId === invite.id;
                  return (
                    <View key={invite.id} style={styles.inviteCard}>
                      <View style={styles.inviteRow}>
                        <Text style={styles.inviteName}>{fromName}</Text>
                        <Ionicons name="arrow-forward" size={14} color={PALETTE.gold} />
                        <Text style={styles.inviteName}>{toName}</Text>
                      </View>
                      <Text style={styles.inviteStatus}>{copy.status[invite.status] ?? invite.status}</Text>
                      {isInvitee && invite.status === "pending" ? (
                        <View style={styles.inviteActions}>
                          <Pressable
                            style={({ pressed }) => [
                              styles.acceptButton,
                              pressed && styles.acceptButtonPressed,
                              isProcessing && styles.inviteDisabled
                            ]}
                            onPress={() => handleRespond(invite, "accepted")}
                            disabled={isProcessing}
                          >
                            <Text style={styles.acceptText}>{copy.accept}</Text>
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [
                              styles.passButton,
                              pressed && styles.passButtonPressed,
                              isProcessing && styles.inviteDisabled
                            ]}
                            onPress={() => handleRespond(invite, "passed")}
                            disabled={isProcessing}
                          >
                            <Text style={styles.passText}>{copy.pass}</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>{copy.noInvites}</Text>
              )}

              {plan.creatorId === userId ? (
                <>
                  <Text style={styles.sectionTitle}>{copy.inviteMatches}</Text>
                  {matchesQuery.isLoading ? (
                    <ActivityIndicator color={PALETTE.gold} />
                  ) : matchesQuery.data && matchesQuery.data.length ? (
                    matchesQuery.data.map((match) => {
                      const otherUserId = match.participants.find((id) => id !== userId) ?? match.participants[0];
                      const name = match.otherDisplayName ?? copy.creatorFallback;
                      const alreadyInvited = otherUserId ? inviteeIds.has(otherUserId) : false;
                      return (
                        <View key={match.id} style={styles.matchRow}>
                          <Text style={styles.matchName}>{name}</Text>
                          <Pressable
                            onPress={() => otherUserId && handleInvite(otherUserId)}
                            disabled={!otherUserId || alreadyInvited || actionId === otherUserId}
                            style={({ pressed }) => [
                              styles.inviteButton,
                              alreadyInvited && styles.inviteButtonDisabled,
                              pressed && !alreadyInvited && styles.inviteButtonPressed
                            ]}
                          >
                            <Text style={styles.inviteButtonText}>
                              {alreadyInvited ? copy.invited : copy.invite}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>{copy.noMatches}</Text>
                  )}
                </>
              ) : null}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.4)"
  },
  title: {
    color: PALETTE.sand,
    fontSize: 18,
    fontWeight: "700"
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: PALETTE.gold,
    fontSize: 15,
    fontWeight: "700"
  },
  emptyText: {
    color: "rgba(242, 231, 215, 0.75)",
    fontSize: 13
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.25)"
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
  cardNotes: {
    marginTop: 8,
    color: "rgba(242, 231, 215, 0.7)",
    fontSize: 12
  },
  inviteCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(217, 192, 143, 0.25)",
    marginBottom: 10
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  inviteName: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 13
  },
  inviteStatus: {
    color: "rgba(242, 231, 215, 0.75)",
    fontSize: 12,
    marginTop: 6
  },
  inviteActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10
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
  inviteDisabled: {
    opacity: 0.6
  },
  passText: {
    color: PALETTE.sand,
    fontWeight: "600",
    fontSize: 12
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(217, 192, 143, 0.2)"
  },
  matchName: {
    color: PALETTE.sand,
    fontSize: 13,
    fontWeight: "600"
  },
  inviteButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PALETTE.gold
  },
  inviteButtonPressed: {
    opacity: 0.85
  },
  inviteButtonDisabled: {
    backgroundColor: "rgba(217, 192, 143, 0.35)"
  },
  inviteButtonText: {
    color: PALETTE.deep,
    fontWeight: "700",
    fontSize: 12
  }
});

export default PlanDetailScreen;
