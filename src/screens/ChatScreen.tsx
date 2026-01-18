import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Alert,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Image
} from "react-native";
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, Composer } from "react-native-gifted-chat";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SafeAreaView from "../components/SafeAreaView";
import { LinearGradient } from "expo-linear-gradient";
import { useMessages } from "../hooks/useMessages";
import { useMatches, useSendMessage } from "../hooks/useMatches";
import { useAuthStore } from "../state/authStore";
import { useChatStore } from "../state/chatStore";
import { markMessagesAsRead } from "../services/matchService";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { getErrorMessage, logError, useErrorCopy } from "../lib/errorMessages";
import { fetchProfile } from "../services/profileService";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl } from "../lib/storage";
import { useNotificationsStore } from "../state/notificationsStore";
import { blockUser } from "../services/moderationService";

type Props = NativeStackScreenProps<any>;

const PALETTE = {
  deep: "#0b1f16",
  forest: "#0f3b2c",
  pine: "#1c5d44",
  gold: "#d9c08f",
  sand: "#f2e7d7",
  clay: "#b23c3a",
  mist: "rgba(255,255,255,0.08)"
};

const ChatScreen = ({ route, navigation }: Props) => {
  const copy = useLocalizedCopy({
    en: {
      blockTitle: "Block & end chat?",
      blockBody: "We will block this contact and end the chat.",
      blockConfirm: "Block",
      blockSuccess: "Contact blocked.",
      blockFailed: "Blocking failed.",
      reportTitle: "Report & end chat",
      reportBody: "We will block this contact and delete the chat.",
      cancel: "Cancel",
      report: "Report",
      reported: "Reported",
      reportedBody: "Contact was blocked and the chat removed.",
      errorTitle: "Error",
      reportFailed: "Report failed.",
      reportLabel: "Report",
      typing: "typing…",
      online: "Online",
      lastSeen: (time: string) => `last active ${time}`,
      placeholder: "Type a message...",
      sendFailed: "Message could not be sent.",
      fallbackName: "Connection"
    },
    de: {
      blockTitle: "Blockieren & Chat beenden?",
      blockBody: "Der Kontakt wird blockiert und der Chat beendet.",
      blockConfirm: "Blockieren",
      blockSuccess: "Kontakt wurde blockiert.",
      blockFailed: "Blockieren fehlgeschlagen.",
      reportTitle: "Melden & Chat beenden",
      reportBody: "Der Kontakt wird blockiert und der Chat gelöscht.",
      cancel: "Abbrechen",
      report: "Melden",
      reported: "Gemeldet",
      reportedBody: "Kontakt wurde blockiert und der Chat beendet.",
      errorTitle: "Fehler",
      reportFailed: "Meldung fehlgeschlagen.",
      reportLabel: "Melden",
      typing: "schreibt…",
      online: "Online",
      lastSeen: (time: string) => `zuletzt aktiv ${time}`,
      placeholder: "Nachricht schreiben...",
      sendFailed: "Nachricht konnte nicht gesendet werden.",
      fallbackName: "Verbindung"
    },
    fr: {
      blockTitle: "Bloquer et fermer le chat ?",
      blockBody: "Nous allons bloquer ce contact et fermer le chat.",
      blockConfirm: "Bloquer",
      blockSuccess: "Contact bloqué.",
      blockFailed: "Échec du blocage.",
      reportTitle: "Signaler et quitter",
      reportBody: "Le contact sera bloqué et la conversation supprimée.",
      cancel: "Annuler",
      report: "Signaler",
      reported: "Signalé",
      reportedBody: "Contact bloqué et conversation supprimée.",
      errorTitle: "Erreur",
      reportFailed: "Échec du signalement.",
      reportLabel: "Signaler",
      typing: "écrit…",
      online: "En ligne",
      lastSeen: (time: string) => `dernière activité ${time}`,
      placeholder: "Écrire un message...",
      sendFailed: "Impossible d'envoyer le message.",
      fallbackName: "Connexion"
    },
    ru: {
      blockTitle: "Заблокировать и закрыть чат?",
      blockBody: "Мы заблокируем контакт и закроем чат.",
      blockConfirm: "Заблокировать",
      blockSuccess: "Контакт заблокирован.",
      blockFailed: "Не удалось заблокировать.",
      reportTitle: "Пожаловаться и удалить чат",
      reportBody: "Мы заблокируем контакт и удалим чат.",
      cancel: "Отмена",
      report: "Пожаловаться",
      reported: "Жалоба отправлена",
      reportedBody: "Контакт заблокирован, чат завершён.",
      errorTitle: "Ошибка",
      reportFailed: "Не удалось отправить жалобу.",
      reportLabel: "Пожаловаться",
      typing: "пишет…",
      online: "Онлайн",
      lastSeen: (time: string) => `был(а) в сети ${time}`,
      placeholder: "Напишите сообщение...",
      sendFailed: "Не удалось отправить сообщение.",
      fallbackName: "Связь"
    }
  });
  const errorCopy = useErrorCopy();
  const { placeholder } = copy;
  const { matchId, participantId } = route.params ?? {};
  const session = useAuthStore((state) => state.session);
  const insets = useSafeAreaInsets();
  const setUnread = useChatStore((state) => state.setUnread);
  const typingMatches = useChatStore((state) => state.typingMatches);
  const { messages, isLoading, sendTyping } = useMessages(matchId);
  const { data: matches = [] } = useMatches();
  const sendMessageMutation = useSendMessage(matchId);
  const [headerMeta, setHeaderMeta] = useState<{ name: string | null; photo: string | null; isIncognito: boolean }>({
    name: null,
    photo: null,
    isIncognito: false
  });
  const notifications = useNotificationsStore((state) => state.items);
  const [inputText, setInputText] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (matchId) {
      setUnread(matchId, 0);
    }
  }, [matchId, setUnread]);

  useEffect(() => {
    if (!session?.user?.id || !matchId) {
      return;
    }
    markMessagesAsRead(matchId, session.user.id).catch((error) => {
      console.warn("Failed to mark messages read", error);
    });
  }, [matchId, session?.user?.id, messages.length]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const onSend = useCallback(
    async (items: IMessage[] = []) => {
      const [message] = items;
      const content = message?.text?.trim();
      if (!content) {
        return;
      }
      try {
        await sendMessageMutation.mutateAsync(content);
        setInputText("");
      } catch (error: any) {
        logError(error, "send-message");
        Alert.alert(copy.errorTitle, getErrorMessage(error, errorCopy, copy.sendFailed));
      }
    },
    [copy.errorTitle, copy.sendFailed, errorCopy, sendMessageMutation]
  );

  const renderComposer = useCallback(
    (composerProps: any) => {
      const handleChangeText = (text: string) => {
        setInputText(text);
        composerProps?.onTextChanged?.(text);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (text && text.trim().length) {
          sendTyping?.(true);
          typingTimeoutRef.current = setTimeout(() => sendTyping?.(false), 1500);
        } else {
          sendTyping?.(false);
        }
      };
      const maxLength =
        composerProps?.textInputProps?.maxLength && composerProps.textInputProps.maxLength > 0
          ? composerProps.textInputProps.maxLength
          : undefined;

      return (
        <View style={styles.textBubble}>
          <Composer
            {...composerProps}
            text={inputText}
            onTextChanged={handleChangeText}
            placeholder={placeholder}
            textInputStyle={styles.composerInput}
            textInputProps={{
              ...composerProps.textInputProps,
              maxLength,
              placeholder: placeholder,
              placeholderTextColor: "#9ca3af",
              multiline: true,
              enablesReturnKeyAutomatically: true,
              underlineColorAndroid: "transparent"
            }}
          />
        </View>
      );
    },
    [inputText, placeholder, sendTyping]
  );

  const renderSend = useCallback(
    (sendProps: any) => {
      const disabled = !sendProps.text || !sendProps.text.trim();
      return (
        <Send
          {...sendProps}
          disabled={disabled}
          containerStyle={[styles.sendButtonRound, disabled && styles.sendButtonDisabled]}
        >
          <LinearGradient
            colors={[PALETTE.gold, "#8b6c2a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendButtonInner}
          >
            <Ionicons name="paper-plane" size={22} color="#fff" />
          </LinearGradient>
        </Send>
      );
    },
    []
  );

  const renderTicks = useCallback(
    (_messageProps: any) => {
      const message = _messageProps?.currentMessage;
      if (!message || message?.user?._id !== session?.user?.id) {
        return null;
      }
      const read = Boolean(message.readAt);
      const color = read ? PALETTE.deep : "rgba(11,31,22,0.5)";
      return <Ionicons name="checkmark-done" size={16} color={color} />;
    },
    [session?.user?.id]
  );

  const renderInputToolbar = useCallback(
    (toolbarProps: any) => (
      <InputToolbar
        {...toolbarProps}
        renderComposer={renderComposer}
        renderSend={renderSend}
        containerStyle={styles.inputToolbar}
        primaryStyle={styles.inputPrimary}
      />
    ),
    [renderComposer, renderSend]
  );

  const currentMatch = matches.find((item) => item.id === matchId);
  const matchIsIncognito =
    headerMeta.isIncognito || Boolean(currentMatch?.otherIsIncognito || !currentMatch?.previewPhotoUrl);
  const matchName = headerMeta.name || currentMatch?.otherDisplayName || copy.fallbackName;
  const matchPhoto = matchIsIncognito ? null : headerMeta.photo || currentMatch?.previewPhotoUrl || null;
  const isTyping = Boolean(typingMatches[matchId]);
  const online = currentMatch?.lastMessageAt
    ? Date.now() - new Date(currentMatch.lastMessageAt).getTime() < 5 * 60 * 1000
    : false;
  const statusText = isTyping
    ? copy.typing
    : online
    ? copy.online
    : currentMatch?.lastMessageAt
    ? copy.lastSeen(new Date(currentMatch.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    : "";

  const renderAvatar = useCallback(
    (avatarProps: any) => {
      const isOwn = avatarProps?.currentMessage?.user?._id === session?.user?.id;
      if (isOwn) return null;
      if (matchIsIncognito) {
        return (
          <LinearGradient
            colors={["#b5b5b5", "#f2f2f2"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.incognitoBubbleGradient}
          >
            <Ionicons name="lock-closed" size={18} color="#f7f7f7" style={styles.lockIconBubble} />
          </LinearGradient>
        );
      }
      if (!matchPhoto) return null;
      return <Image source={{ uri: matchPhoto }} style={styles.bubbleAvatar} />;
    },
    [matchIsIncognito, matchPhoto, session?.user?.id]
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateFromMatches = () => {
      const found = matches.find((item) => item.id === matchId);
      if (found) {
        setHeaderMeta((prev) => {
          const next = {
            name: found.otherDisplayName ?? null,
            photo: found.previewPhotoUrl ?? null,
            isIncognito: Boolean(found.otherIsIncognito || !found.previewPhotoUrl)
          };
          if (prev.name === next.name && prev.photo === next.photo) {
            return prev.isIncognito === next.isIncognito ? prev : { ...next };
          }
          return next;
        });
        return found;
      }
      return null;
    };

    const foundMatch = hydrateFromMatches();
    const fallbackParticipant =
      participantId ||
      foundMatch?.participants?.find((p) => p && p !== session?.user?.id) ||
      null;

      if (!fallbackParticipant && foundMatch?.otherDisplayName) {
        return;
      }

    const loadProfile = async () => {
      if (!fallbackParticipant) return;
      try {
        const profile = await fetchProfile(fallbackParticipant);
        if (!profile || cancelled) return;
        let photoUrl: string | null = null;
        const firstPhoto = Array.isArray(profile.photos) && profile.photos.length > 0 ? profile.photos[0] : null;
        if (firstPhoto?.url && /^https?:\/\//.test(firstPhoto.url)) {
          photoUrl = firstPhoto.url;
        } else if (profile.primaryPhotoPath) {
          try {
            photoUrl = await getPhotoUrl(profile.primaryPhotoPath, getSupabaseClient());
          } catch (error) {
            console.warn("[ChatScreen] Failed to resolve profile photo", error);
          }
        }
        if (cancelled) return;
        setHeaderMeta((prev) => ({
          name: profile.displayName ?? foundMatch?.otherDisplayName ?? prev.name ?? null,
          photo: prev.isIncognito ? null : photoUrl ?? prev.photo ?? null,
          isIncognito: prev.isIncognito
        }));
      } catch (error) {
        console.warn("[ChatScreen] Failed to fetch participant profile", error);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [matchId, matches, participantId, session?.user?.id]);

  useEffect(() => {
    if (!matchId) return;
    const avatarFromNotification = notifications.find(
      (entry) =>
        (entry.data?.match_id === matchId || entry.data?.matchId === matchId) &&
        (entry.data?.avatar_path || entry.data?.avatarUrl)
    );
    if (avatarFromNotification) {
      const url = avatarFromNotification.data?.avatar_path ?? avatarFromNotification.data?.avatarUrl ?? null;
      const isIncognito =
        avatarFromNotification.data?.liker_incognito ??
        avatarFromNotification.data?.likerIncognito ??
        avatarFromNotification.data?.other_incognito ??
        avatarFromNotification.data?.otherIncognito ??
        false;
      setHeaderMeta((prev) => ({
        name: prev.name,
        photo: prev.isIncognito || isIncognito ? null : prev.photo ?? (url ?? null),
        isIncognito: prev.isIncognito || Boolean(isIncognito)
      }));
    }
  }, [matchId, notifications]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const otherUserId = useMemo(() => {
    if (participantId) return participantId;
    if (!matchId) return null;
    const match = matches.find((item) => item.id === matchId);
    return match?.participants?.find((participant) => participant && participant !== session?.user?.id) ?? null;
  }, [matchId, matches, participantId, session?.user?.id]);

  const handleBlock = useCallback(() => {
    if (isBlocking) {
      return;
    }
    const viewerId = session?.user?.id;
    if (!viewerId || !otherUserId) {
      Alert.alert(copy.errorTitle, copy.blockFailed);
      return;
    }
    Alert.alert(copy.blockTitle, copy.blockBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.blockConfirm,
        style: "destructive",
        onPress: () => {
          const run = async () => {
            setIsBlocking(true);
            try {
              await blockUser(viewerId, otherUserId);
              Alert.alert(copy.blockSuccess);
              navigation.goBack();
            } catch (error: any) {
              logError(error, "block-user");
              Alert.alert(copy.errorTitle, getErrorMessage(error, errorCopy, copy.blockFailed));
            } finally {
              setIsBlocking(false);
            }
          };
          void run();
        }
      }
    ]);
  }, [
    copy.blockBody,
    copy.blockConfirm,
    copy.blockFailed,
    copy.blockSuccess,
    copy.blockTitle,
    copy.cancel,
    copy.errorTitle,
    errorCopy,
    isBlocking,
    navigation,
    otherUserId,
    session?.user?.id
  ]);

  if (!session || isLoading) {
    return (
      <LinearGradient
        colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PALETTE.sand} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const giftedMessages: IMessage[] = messages
    .slice()
    .reverse()
    .map((message) => ({
      _id: message.id,
      text: message.content,
      createdAt: new Date(message.createdAt),
      readAt: message.readAt,
      user: {
        _id: message.senderId,
        name: message.senderId === session.user.id ? "Du" : copy.fallbackName
      }
    }));

  return (
    <LinearGradient
      colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.topBarButton}>
            <Ionicons name="chevron-back" size={24} color={PALETTE.sand} />
          </Pressable>
          <View style={styles.topBarCenter}>
            {matchIsIncognito ? (
              <LinearGradient
                colors={["#b5b5b5", "#f2f2f2"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.incognitoAvatar}
              >
                <Ionicons name="lock-closed" size={22} color="#f7f7f7" style={styles.lockIcon} />
              </LinearGradient>
            ) : matchPhoto ? (
              <Image source={{ uri: matchPhoto }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
            <View>
              <Text style={styles.topBarTitle} numberOfLines={1}>
                {matchName}
              </Text>
              {statusText ? (
                <Text style={styles.topBarSubtitle} numberOfLines={1}>
                  {statusText}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.topBarActions}>
            <Pressable
              onPress={handleBlock}
              style={[styles.topBarButton, (isBlocking || !otherUserId) && styles.topBarButtonDisabled]}
              disabled={isBlocking || !otherUserId}
              accessibilityRole="button"
              accessibilityLabel={copy.blockConfirm}
            >
              <Ionicons name="ban-outline" size={22} color={PALETTE.sand} />
            </Pressable>
          </View>
        </View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom : 0}
        >
          <GiftedChat
            style={styles.chatBody}
            messages={giftedMessages}
            onSend={onSend}
            user={{
              _id: session.user.id
            }}
            placeholder={placeholder}
            isLoadingEarlier={isLoading || sendMessageMutation.isPending}
            showUserAvatar={false}
            alwaysShowSend
            keyboardShouldPersistTaps="handled"
            renderTicks={renderTicks}
            renderAvatar={renderAvatar}
            bottomOffset={insets.bottom}
            minComposerHeight={44}
            minInputToolbarHeight={56}
            text={inputText}
            onInputTextChanged={setInputText}
            messagesContainerStyle={styles.messagesContainer}
            renderInputToolbar={renderInputToolbar}
            renderBubble={(bubbleProps) => (
              <Bubble
                {...bubbleProps}
                wrapperStyle={{
                  left: {
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(217,192,143,0.15)"
                  },
                  right: { backgroundColor: PALETTE.gold }
                }}
                textStyle={{
                  left: { color: PALETTE.sand },
                  right: { color: PALETTE.deep }
                }}
                timeTextStyle={{
                  left: { color: PALETTE.sand },
                  right: { color: PALETTE.deep }
                }}
              />
            )}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  keyboardAvoider: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  messagesContainer: {
    paddingBottom: 6,
    backgroundColor: "transparent"
  },
  chatBody: {
    flex: 1
  },
  inputToolbar: {
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "transparent",
    borderRadius: 18,
    marginHorizontal: 10,
    borderWidth: 0,
    borderColor: "transparent"
  },
  inputPrimary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    gap: 8
  },
  textBubble: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(217,192,143,0.2)",
    paddingHorizontal: 14,
    marginRight: 6,
    minHeight: 46,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  composerInput: {
    flex: 1,
    color: PALETTE.sand,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 0
  },
  sendButtonRound: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "transparent",
    borderWidth: 1.2,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6
  },
  sendButtonDisabled: {
    opacity: 0.45
  },
  sendButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center"
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(217,192,143,0.18)",
    backgroundColor: "rgba(0,0,0,0.12)"
  },
  topBarButton: {
    padding: 6
  },
  topBarButtonDisabled: {
    opacity: 0.55
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: PALETTE.sand,
    maxWidth: 190
  },
  topBarSubtitle: {
    fontSize: 12,
    color: "rgba(242,231,215,0.7)",
    marginTop: 2,
    maxWidth: 190
  },
  topBarCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.1,
    borderColor: "rgba(217,192,143,0.4)"
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.1,
    borderColor: "rgba(217,192,143,0.4)"
  },
  bubbleAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 6
  },
  incognitoAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center"
  },
  incognitoBubbleGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6
  },
  lockIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -11 }, { translateY: -11 }]
  },
  lockIconBubble: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -9 }, { translateY: -9 }]
  },
  reportText: {
    color: "#eb5757",
    fontWeight: "600"
  }
});
