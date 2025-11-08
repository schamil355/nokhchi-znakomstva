import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMessages, useSendMessage, useMatches } from "./hooks";
import { useSessionStore } from "../../store/sessionStore";
import { blockUser, REPORT_REASONS, submitReport, useSafety } from "../moderation";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ToastProvider";
import { Button, Card, Chip, EmptyState, Skeleton } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { useTranslation } from "../../lib/i18n";

const ChatScreen = (): JSX.Element => {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const session = useSessionStore((state) => state.session);
  const { data: matches } = useMatches();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { guardAction, validateMessage } = useSafety();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const match = useMemo(
    () => matches?.find((item) => item.id === matchId),
    [matches, matchId],
  );

  const otherUserId = useMemo(() => {
    if (!match) return undefined;
    if (match.otherUserProfile) return match.otherUserProfile.id;
    return match.userA === session?.user.id ? match.userB : match.userA;
  }, [match, session?.user.id]);

  const { data, isLoading } = useMessages(matchId ?? "", otherUserId);
  const [text, setText] = useState("");
  const sendMessageMutation = useSendMessage(matchId ?? "", otherUserId);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] =
    useState<(typeof REPORT_REASONS)[number]>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      validateMessage(text);
      await sendMessageMutation.mutateAsync({ text });
      setText("");
      showToast(t("chat.screen.sendSuccess"), "success");
    } catch (error: any) {
      showToast(error?.message ?? t("chat.screen.sendError"), "error");
    }
  };

  const handleBlock = async () => {
    if (!otherUserId || !session?.user.id) return;
    try {
      guardAction();
      setBlocking(true);
      await blockUser({ blockerId: session.user.id, blockedUserId: otherUserId });
      showToast(t("chat.screen.blockSuccess"), "info");
      queryClient.invalidateQueries({ queryKey: ["matches", session.user.id] });
      router.replace("/matches");
    } catch (error: any) {
      showToast(error?.message ?? t("chat.screen.blockError"), "error");
    } finally {
      setBlocking(false);
    }
  };

  const handleReport = async () => {
    if (!otherUserId || !session?.user.id) return;
    try {
      guardAction();
      setReporting(true);
      await submitReport({
        reporterId: session.user.id,
        reportedUserId: otherUserId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      showToast(t("chat.screen.reportSuccess"), "info");
      setReportVisible(false);
      setReportDetails("");
      setReportReason("spam");
    } catch (error: any) {
      showToast(error?.message ?? t("chat.screen.reportError"), "error");
    } finally {
      setReporting(false);
    }
  };

  if (!matchId || !session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          title={t("chat.screen.notFoundTitle")}
          description={t("chat.screen.notFoundDescription")}
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        {[0, 1, 2].map((index) => (
          <Card key={index} padding={16}>
            <View style={styles.skeletonRow}>
              <Skeleton width={46} height={46} radius={14} />
              <View style={styles.skeletonBody}>
                <Skeleton height={16} width="70%" />
                <Skeleton height={14} width="45%" />
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <FlatList
        data={data ?? []}
        inverted
        contentContainerStyle={styles.messageList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOwn = item.senderId === session.user.id;
          const bubbleStyle = isOwn
            ? { backgroundColor: colors.primary }
            : {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: StyleSheet.hairlineWidth,
              };
          return (
            <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : undefined]}>
              <View style={[styles.messageBubble, bubbleStyle]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
                ) : null}
                {item.content ? (
                  <Text
                    style={[
                      styles.messageText,
                      { color: isOwn ? colors.primaryText : colors.text },
                    ]}
                  >
                    {item.content}
                  </Text>
                ) : null}
                {item.optimistic ? (
                  <Text style={[styles.optimisticInfo, { color: colors.muted }]}>
                    {t("chat.screen.optimistic")}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title={t("chat.screen.emptyTitle")}
            description={t("chat.screen.emptyDescription")}
          />
        }
      />
      <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={t("chat.screen.inputPlaceholder")}
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Button
          title={t("chat.screen.send")}
          onPress={handleSend}
          loading={sendMessageMutation.isPending}
          disabled={!text.trim()}
          style={styles.sendButtonWrapper}
        />
      </View>

      <View style={[styles.actionBar, { borderTopColor: colors.border }]}>
        <Button
          title={t("chat.screen.report")}
          variant="secondary"
          onPress={() => setReportVisible(true)}
          style={styles.flexButton}
        />
        <Button
          title={t("chat.screen.block")}
          variant="secondary"
          onPress={handleBlock}
          loading={blocking}
          style={styles.flexButton}
        />
      </View>

      <Modal visible={reportVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("chat.screen.modalTitle")}
            </Text>
            <Text style={[styles.modalHint, { color: colors.muted }]}>
              {t("chat.screen.modalHint")}
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
              placeholder={t("chat.screen.detailsPlaceholder")}
              placeholderTextColor={colors.muted}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <Button
                title={t("chat.screen.cancel")}
                variant="ghost"
                onPress={() => setReportVisible(false)}
              />
              <Button
                title={t("chat.screen.submitReport")}
                onPress={handleReport}
                loading={reporting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  messageList: {
    padding: 16,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  messageText: {
    fontSize: 15,
  },
  optimisticInfo: {
    marginTop: 6,
    fontSize: 10,
    color: "#fbbf24",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f3f4f6",
  },
  sendButtonWrapper: {
    minWidth: 110,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  flexButton: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalHint: {
    textAlign: "center",
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailsInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  skeletonBody: {
    flex: 1,
    gap: 8,
  },
});

export default ChatScreen;
