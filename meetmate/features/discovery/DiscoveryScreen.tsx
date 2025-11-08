import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { selectSession, useSessionStore } from "../../store/sessionStore";
import {
  ensureUserLocation,
  fetchBlockedIds,
  mapPublicProfilesToCandidates,
  sendSwipeAction,
} from "./service";
import type { PublicProfileRow } from "./service";
import { defaultDiscoveryPreferences, DiscoveryCandidate, SwipeAction } from "./types";
import { requestLocation } from "../../lib/location";
import { rankCandidatesClassic, rankCandidatesVector } from "../../lib/matching";
import { fetchProfileForUser } from "../profile";
import { Profile } from "../../types";
import { REPORT_REASONS, blockUser, submitReport, useSafety } from "../moderation";
import { useToast } from "../../components/ToastProvider";
import { useEntitlements } from "../paywall/hooks";
import { Avatar, Button, Card, Chip, EmptyState, Skeleton } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";
import { getSupabase } from "../../lib/supabase";
import { useRequireVerification } from "../verification/hooks";
import { useSearchPrefs } from "../preferences/useSearchPrefs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SUPERLIKE_THRESHOLD = 120;

const SwipeCard = ({ candidate }: { candidate: DiscoveryCandidate }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const mainPhoto = candidate.photos[0]?.url;
  return (
    <Card padding={0} testID={`discovery-card-${candidate.id}`}>
      {mainPhoto ? (
        <Image
          source={{ uri: mainPhoto }}
          style={[styles.photo, { borderTopLeftRadius: 18, borderTopRightRadius: 18 }]}
        />
      ) : (
        <View
          style={[
            styles.photo,
            styles.photoPlaceholder,
            {
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              backgroundColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.placeholderText, { color: colors.muted }]}>
            {t("discovery.noPhoto")}
          </Text>
        </View>
      )}
      <View style={[styles.cardInfo, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {candidate.displayName}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.muted }]}>
          {t(`profile.gender.${candidate.gender}`)} ·{" "}
          {t(`profile.orientation.${candidate.orientation}`)} ·{" "}
          {candidate.distanceKm
            ? t("discovery.distance", { distance: candidate.distanceKm.toFixed(1) })
            : t("discovery.distanceUnknown")}
        </Text>
        <Text style={[styles.cardBio, { color: colors.text }]} numberOfLines={4}>
          {candidate.bio || t("discovery.bioFallback")}
        </Text>
        <View style={styles.interestRow}>
          {candidate.interests.slice(0, 4).map((interest) => (
            <Chip
              key={interest}
              label={t(`profile.interests.${interest}`, { defaultValue: interest })}
            />
          ))}
        </View>
      </View>
    </Card>
  );
};

const DiscoveryScreen = (): JSX.Element => {
  useRequireVerification();
  const session = useSessionStore(selectSession);
  const queryClient = useQueryClient();
  const { guardAction } = useSafety();
  const { showToast } = useToast();
  const { entitlements, consumeSuperLike, hasEntitlement } = useEntitlements();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { prefs, isLoading: prefsLoading } = useSearchPrefs();
  const regionMode = prefs?.regionMode ?? "NEARBY";
  const router = useRouter();
  const [freeLikesUsed, setFreeLikesUsed] = useState(0);

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchProfile, setMatchProfile] = useState<DiscoveryCandidate | null>(null);
  const [viewerProfile, setViewerProfile] = useState<Profile | null>(null);

  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] =
    useState<(typeof REPORT_REASONS)[number]>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const hiddenIdsRef = useRef<Set<string>>(new Set());
  const blockedRef = useRef<string[]>([]);

  const loadPrerequisites = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoadingLocation(true);
    blockedRef.current = await fetchBlockedIds(session.user.id);
    const profile = await fetchProfileForUser(session.user.id);
    if (profile) {
      setViewerProfile(profile);
      if (profile.location) {
        setLocation(profile.location);
      }
    }

    const freshLocation = await requestLocation();
    if (freshLocation) {
      setLocation(freshLocation);
    } else if (!profile?.location) {
      const savedLocation = await ensureUserLocation(session.user.id);
      if (savedLocation) {
        setLocation(savedLocation);
      }
    }

    setLoadingLocation(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      hiddenIdsRef.current.clear();
      loadPrerequisites();
    }, [loadPrerequisites]),
  );

  const discoveryQueryKey = [
    "discovery",
    session?.user.id ?? "anon",
    regionMode,
    location?.latitude ?? null,
    location?.longitude ?? null,
  ] as const;

  const discoveryQuery = useQuery({
    queryKey: discoveryQueryKey,
    enabled: Boolean(
      session?.user.id &&
        !loadingLocation &&
        !prefsLoading &&
        prefs &&
        (regionMode !== "NEARBY" || location),
    ),
    queryFn: async () => {
      if (!session?.user.id || !prefs) {
        return [] as DiscoveryCandidate[];
      }
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("get_candidates_region", {
        p_viewer: session.user.id,
        p_mode: regionMode,
        p_limit: defaultDiscoveryPreferences.maxResults,
      });
      if (error) {
        throw error;
      }
      const rows = (data ?? []) as PublicProfileRow[];
      const filteredRows = rows.filter(
        (row) =>
          !blockedRef.current.includes(row.id) && !hiddenIdsRef.current.has(row.id),
      );
      return mapPublicProfilesToCandidates(filteredRows, location ?? null);
    },
    staleTime: 60_000,
  });

  const swipeMutation = useMutation({
    mutationFn: ({
      targetUserId,
      action,
    }: {
      targetUserId: string;
      action: SwipeAction;
    }) => {
      if (!session?.user.id) {
        throw new Error(t("errors.notLoggedIn"));
      }
      return sendSwipeAction({ currentUserId: session.user.id, targetUserId, action });
    },
    onSuccess: (data, variables) => {
      if (data.matchId) {
        const matchCandidate = discoveryQuery.data?.find(
          (candidate) => candidate.id === variables.targetUserId,
        );
        if (matchCandidate) {
          setMatchProfile(matchCandidate);
        }
        setMatchId(data.matchId);
      }
    },
  });

  const [cardIndex, setCardIndex] = useState(0);

  const [rankedCandidates, setRankedCandidates] = useState<DiscoveryCandidate[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!discoveryQuery.data) {
        setRankedCandidates([]);
        return;
      }
      if (!viewerProfile) {
        setRankedCandidates(discoveryQuery.data);
        return;
      }
      try {
        const result = await rankCandidatesVector(
          viewerProfile,
          discoveryQuery.data,
          rankCandidatesClassic,
        );
        if (!cancelled) {
          setRankedCandidates(result);
        }
      } catch (error) {
        console.warn("Vector rank failed", error);
        if (!cancelled) {
          setRankedCandidates(rankCandidatesClassic(discoveryQuery.data, viewerProfile));
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [discoveryQuery.data, viewerProfile]);

  useEffect(() => {
    setCardIndex(0);
  }, [rankedCandidates.length]);

  const activeCandidate = rankedCandidates[cardIndex];
  const nextCandidate = rankedCandidates[cardIndex + 1];

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const rotation = (translateX.value / SCREEN_WIDTH) * 15;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotation}deg` },
      ],
    };
  });

  const gesture = Gesture.Pan()
    .onChange((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const { translationX, translationY } = event;
      let action: SwipeAction | null = null;
      if (translationX > SWIPE_THRESHOLD) {
        action = "like";
      } else if (translationX < -SWIPE_THRESHOLD) {
        action = "pass";
      } else if (translationY < -SUPERLIKE_THRESHOLD) {
        action = "superlike";
      }

      if (!action) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        return;
      }

      const exitX =
        action === "pass" ? -SCREEN_WIDTH : action === "like" ? SCREEN_WIDTH : 0;
      const exitY = action === "superlike" ? -SCREEN_WIDTH : translationY;

      translateX.value = withTiming(exitX, { duration: 220 }, () => {
        translateX.value = 0;
      });
      translateY.value = withTiming(exitY, { duration: 220 }, () => {
        translateY.value = 0;
      });

      if (activeCandidate) {
        runOnJS(handleSwipe)(activeCandidate, action);
      }
    });

  const FREE_LIKE_LIMIT = 50;
  useEffect(() => {
    if (entitlements.unlimitedSwipes) {
      setFreeLikesUsed(0);
    }
  }, [entitlements.unlimitedSwipes]);

  const handleSwipe = (candidate: DiscoveryCandidate, action: SwipeAction) => {
    if (action !== "pass") {
      guardAction("like");
      if (action === "like") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (action === "superlike") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const hasUnlimited = hasEntitlement("unlimited");
      if (!hasUnlimited && freeLikesUsed >= FREE_LIKE_LIMIT) {
        showToast(t("discovery.swipe.limitPremium"), "info");
        return;
      }
      if (!hasUnlimited) {
        setFreeLikesUsed((prev) => prev + 1);
      }
      if (action === "superlike") {
        if (!hasEntitlement("super_likes")) {
          showToast(t("discovery.swipe.superLikeEmpty"), "info");
          return;
        }
        consumeSuperLike();
      }
    }

    hiddenIdsRef.current.add(candidate.id);
    setCardIndex((prev) => prev + 1);
    if (action !== "pass") {
      swipeMutation.mutate({ targetUserId: candidate.id, action });
    }
  };

  const handleRefetch = () => {
    hiddenIdsRef.current.clear();
    setCardIndex(0);
    queryClient.invalidateQueries({ queryKey: discoveryQueryKey });
    void loadPrerequisites();
  };

  const handleBlockCandidate = async (candidate: DiscoveryCandidate) => {
    if (!session?.user.id) return;
    try {
      guardAction();
      setBlocking(true);
      await blockUser({ blockerId: session.user.id, blockedUserId: candidate.id });
      hiddenIdsRef.current.add(candidate.id);
      setCardIndex((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
      showToast(t("discovery.blockSuccess", { name: candidate.displayName }), "info");
    } catch (error: any) {
      showToast(error?.message ?? t("discovery.blockError"), "error");
    } finally {
      setBlocking(false);
    }
  };

  const handleReportCandidate = async () => {
    if (!session?.user.id || !activeCandidate) return;
    try {
      guardAction();
      setReporting(true);
      await submitReport({
        reporterId: session.user.id,
        reportedUserId: activeCandidate.id,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      showToast(t("discovery.reportThanks"), "info");
      setReportVisible(false);
      setReportDetails("");
      setReportReason("spam");
    } catch (error: any) {
      showToast(error?.message ?? t("discovery.reportError"), "error");
    } finally {
      setReporting(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>{t("errors.notLoggedIn")}</Text>
      </View>
    );
  }

  if (loadingLocation || discoveryQuery.isLoading || prefsLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Text style={[styles.header, { color: colors.text }]}>
          {t("discovery.title")}
        </Text>
        <Card padding={0}>
          <Skeleton height={420} />
          <View style={{ padding: spacing(2), gap: spacing(1) }}>
            <Skeleton height={24} width="60%" />
            <Skeleton height={18} width="40%" />
            <Skeleton height={16} width="90%" />
            <Skeleton height={16} width="80%" />
          </View>
        </Card>
      </View>
    );
  }

  if (regionMode === "NEARBY" && !location) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <EmptyState
          title={t("discovery.locationRequiredTitle")}
          description={t("discovery.locationRequiredDescription")}
          actionLabel={t("discovery.retry")}
          onAction={handleRefetch}
        />
      </View>
    );
  }

  if (discoveryQuery.error) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <EmptyState
          title={t("discovery.errorTitle")}
          description={t("discovery.errorDescription")}
          actionLabel={t("discovery.retry")}
          onAction={handleRefetch}
        />
      </View>
    );
  }

  const noCandidates = !rankedCandidates.length || cardIndex >= rankedCandidates.length;
  const emptyDescriptionKey =
    regionMode === "CHECHNYA"
      ? "discovery.empty.chechnya"
      : regionMode === "EUROPE"
        ? "discovery.empty.europe"
        : regionMode === "RUSSIA"
          ? "discovery.empty.russia"
          : "discovery.empty.nearby";
  const needsRegionChange = regionMode === "CHECHNYA" || regionMode === "RUSSIA";
  const emptyActionLabel = needsRegionChange
    ? t("discovery.empty.changeRegion")
    : t("discovery.refresh");
  const emptyAction = needsRegionChange
    ? () => router.push("/preferences/search-region")
    : handleRefetch;

  return (
    <View
      style={[styles.screen, { backgroundColor: colors.background }]}
      testID="discovery-screen"
    >
      <Text style={[styles.header, { color: colors.text }]}>{t("discovery.title")}</Text>
      {noCandidates ? (
        <EmptyState
          title={t("discovery.emptyTitle")}
          description={t(emptyDescriptionKey)}
          actionLabel={emptyActionLabel}
          onAction={emptyAction}
        />
      ) : (
        <View style={styles.deckContainer} testID="discovery-deck">
          {nextCandidate ? (
            <Animated.View
              style={[styles.cardContainer, styles.nextCard]}
              testID="discovery-next-card"
            >
              <SwipeCard candidate={nextCandidate} />
            </Animated.View>
          ) : null}
          {activeCandidate ? (
            <GestureDetector gesture={gesture}>
              <Animated.View
                style={[styles.cardContainer, animatedStyle]}
                testID="discovery-active-card"
              >
                <SwipeCard candidate={activeCandidate} />
              </Animated.View>
            </GestureDetector>
          ) : null}
        </View>
      )}

      {!noCandidates && activeCandidate ? (
        <View style={styles.secondaryActionRow}>
          <Button
            title={t("discovery.reportAction")}
            variant="secondary"
            onPress={() => setReportVisible(true)}
            style={styles.flexButton}
          />
          <Button
            title={t("discovery.blockAction")}
            variant="secondary"
            onPress={() => handleBlockCandidate(activeCandidate)}
            loading={blocking}
            style={styles.flexButton}
          />
        </View>
      ) : null}

      <Modal
        transparent
        visible={Boolean(matchId && matchProfile)}
        animationType="fade"
        testID="discovery-match-modal"
      >
        <View style={styles.modalBackdrop} testID="discovery-match-backdrop">
          <View
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            testID="discovery-match-content"
          >
            {matchProfile ? (
              <Avatar
                uri={matchProfile.photos[0]?.url}
                label={matchProfile.displayName}
                size={82}
              />
            ) : null}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("discovery.matchTitle")}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              {t("discovery.matchSubtitle", { name: matchProfile?.displayName ?? "" })}
            </Text>
            <Button
              title={t("discovery.matchContinue")}
              testID="discovery-match-continue"
              onPress={() => {
                setMatchId(null);
                setMatchProfile(null);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal transparent visible={reportVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.reportModalContent, { backgroundColor: colors.card }]}>
            <Text style={styles.modalTitle}>{t("discovery.reportTitle")}</Text>
            <View style={styles.reasonRow}>
              {REPORT_REASONS.map((reason) => (
                <Chip
                  key={reason}
                  label={t(`moderation.reasons.${reason}`)}
                  selected={reason === reportReason}
                  onPress={() => setReportReason(reason)}
                />
              ))}
            </View>
            <TextInput
              style={styles.detailsInput}
              placeholder={t("discovery.reportDetailsPlaceholder")}
              value={reportDetails}
              onChangeText={setReportDetails}
              maxLength={500}
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                title={t("discovery.reportCancel")}
                variant="ghost"
                onPress={() => setReportVisible(false)}
              />
              <Button
                title={t("discovery.reportSubmit")}
                onPress={handleReportCandidate}
                loading={reporting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f7f8",
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  deckContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cardContainer: {
    width: "100%",
    maxWidth: 360,
  },
  nextCard: {
    position: "absolute",
    top: 16,
    zIndex: -1,
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 5,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  photo: {
    width: "100%",
    height: 440,
  },
  photoPlaceholder: {
    backgroundColor: "#e5e7eb",
  },
  cardInfo: {
    padding: 20,
    gap: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  cardMeta: {
    color: "#6b7280",
  },
  cardBio: {
    color: "#1f2933",
  },
  interestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    backgroundColor: "#2563eb33",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  interestChipText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  infoText: {
    color: "#4b5563",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryActionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  safetyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  reportButton: {
    backgroundColor: "#f97316",
  },
  blockButton: {
    backgroundColor: "#ef4444",
  },
  safetyButtonDisabled: {
    opacity: 0.6,
  },
  safetyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  modalSubtitle: {
    textAlign: "center",
    color: "#4b5563",
  },
  reportModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    gap: 16,
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  reasonChipActive: {
    backgroundColor: "#2563eb33",
    borderColor: "#2563eb",
  },
  reasonChipText: {
    color: "#1f2933",
    textTransform: "capitalize",
    fontWeight: "500",
  },
  reasonChipTextActive: {
    color: "#1f2933",
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  modalPrimary: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  modalPrimaryText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default DiscoveryScreen;
