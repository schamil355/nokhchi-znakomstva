import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMatches } from "./hooks";
import { useSessionStore } from "../../store/sessionStore";
import { REPORT_REASONS, blockUser, submitReport, useSafety } from "../moderation";
import { useToast } from "../../components/ToastProvider";
import { Avatar, Button, Card, Chip, EmptyState, Skeleton } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";
import { useRequireVerification } from "../verification/hooks";

const MatchesList = (): JSX.Element => {
  useRequireVerification();
  const { data, isLoading, refetch, isRefetching } = useMatches();
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const queryClient = useQueryClient();
  const { guardAction } = useSafety();
  const { showToast } = useToast();
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();

  const [reportVisible, setReportVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reportReason, setReportReason] =
    useState<(typeof REPORT_REASONS)[number]>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const containerStyle = useMemo(
    () => [
      styles.container,
      { backgroundColor: colors.background, paddingHorizontal: spacing(2) },
    ],
    [colors.background, spacing],
  );

  const openActions = (userId: string) => {
    setSelectedUserId(userId);
    setReportVisible(true);
  };

  const closeActions = () => {
    setReportVisible(false);
    setSelectedUserId(null);
    setReportDetails("");
    setReportReason("spam");
  };

  const handleBlock = async () => {
    if (!session?.user.id || !selectedUserId) return;
    try {
      guardAction();
      setBlocking(true);
      await blockUser({ blockerId: session.user.id, blockedUserId: selectedUserId });
      showToast(t("chat.matches.blockSuccess"), "info");
      closeActions();
      queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
    } catch (error: any) {
      showToast(error?.message ?? t("chat.matches.blockError"), "error");
    } finally {
      setBlocking(false);
    }
  };

  const handleReport = async () => {
    if (!session?.user.id || !selectedUserId) return;
    try {
      guardAction();
      setReporting(true);
      await submitReport({
        reporterId: session.user.id,
        reportedUserId: selectedUserId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      showToast(t("chat.matches.reportSuccess"), "info");
      closeActions();
    } catch (error: any) {
      showToast(error?.message ?? t("chat.matches.reportError"), "error");
    } finally {
      setReporting(false);
    }
  };

  if (isLoading && !data?.length) {
    return (
      <View style={containerStyle}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={styles.loadingCard}>
            <Card padding={spacing(2)}>
              <View style={styles.loadingRow}>
                <Skeleton width={52} height={52} radius={26} />
                <View style={styles.loadingInfo}>
                  <Skeleton height={18} width="60%" />
                  <Skeleton height={14} width="40%" />
                </View>
              </View>
            </Card>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={!data?.length ? styles.flexGrow : undefined}
        ItemSeparatorComponent={() => <View style={{ height: spacing(1.5) }} />}
        renderItem={({ item }) => {
          const photo = item.otherUserProfile?.photos?.[0]?.url;
          const otherUserId =
            item.otherUserProfile?.id ??
            (item.userA === session?.user.id ? item.userB : item.userA);
          const displayName =
            item.otherUserProfile?.displayName ?? t("chat.matches.unknownUser");
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.rowPressable,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() =>
                router.push({ pathname: "/chat/[matchId]", params: { matchId: item.id } })
              }
              onLongPress={() => otherUserId && openActions(otherUserId)}
            >
              <Card padding={spacing(2)}>
                <View style={styles.rowContent}>
                  <Avatar uri={photo} label={displayName} size={52} />
                  <View style={styles.info}>
                    <Text style={[styles.title, { color: colors.text }]}>
                      {displayName}
                    </Text>
                    <Text
                      style={[styles.preview, { color: colors.muted }]}
                      numberOfLines={1}
                    >
                      {item.lastMessagePreview ?? t("chat.matches.noMessages")}
                    </Text>
                  </View>
                  {item.unreadCount ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.badgeText, { color: colors.primaryText }]}>
                        {item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title={t("chat.matches.emptyTitle")}
            description={t("chat.matches.emptyDescription")}
            actionLabel={t("chat.matches.refresh")}
            onAction={refetch}
          />
        }
      />

      <Modal transparent visible={reportVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Card padding={spacing(2.5)}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("chat.matches.modalTitle")}
            </Text>
            <Text style={[styles.modalHint, { color: colors.muted }]}>
              {t("chat.matches.modalHint")}
            </Text>
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
              style={[
                styles.detailsInput,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder={t("chat.matches.detailsPlaceholder")}
              placeholderTextColor={colors.muted}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <Button
                title={t("chat.matches.cancel")}
                variant="ghost"
                onPress={closeActions}
              />
              <Button
                title={t("chat.matches.block")}
                onPress={handleBlock}
                loading={blocking}
              />
              <Button
                title={t("chat.matches.report")}
                onPress={handleReport}
                loading={reporting}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  flexGrow: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  loadingCard: {
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  loadingInfo: {
    flex: 1,
    gap: 8,
  },
  rowPressable: {
    borderRadius: 18,
    overflow: "hidden",
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  preview: {
    fontSize: 14,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    fontWeight: "700",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  flexButton: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  modalHint: {
    textAlign: "center",
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  detailsInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
});

export default MatchesList;
