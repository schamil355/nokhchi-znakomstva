import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Alert,
  Pressable,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  Image
} from "react-native";
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, Composer } from "react-native-gifted-chat";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useMessages } from "../hooks/useMessages";
import { useMatches, useSendMessage } from "../hooks/useMatches";
import { useAuthStore } from "../state/authStore";
import { useChatStore } from "../state/chatStore";
import { markMessagesAsRead } from "../services/matchService";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { fetchProfile } from "../services/profileService";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl } from "../lib/storage";
import { useNotificationsStore } from "../state/notificationsStore";

type Props = NativeStackScreenProps<any>;

const ChatScreen = ({ route, navigation }: Props) => {
  const copy = useLocalizedCopy({
    en: {
      reportTitle: "Report & end chat",
      reportBody: "We will block this contact and delete the chat.",
      cancel: "Cancel",
      report: "Report",
      reported: "Reported",
      reportedBody: "Contact was blocked and the chat removed.",
      errorTitle: "Error",
      reportFailed: "Report failed.",
      reportLabel: "Report",
      placeholder: "Type a message...",
      sendFailed: "Message could not be sent."
    },
    de: {
      reportTitle: "Melden & Chat beenden",
      reportBody: "Der Kontakt wird blockiert und der Chat gelöscht.",
      cancel: "Abbrechen",
      report: "Melden",
      reported: "Gemeldet",
      reportedBody: "Kontakt wurde blockiert und der Chat beendet.",
      errorTitle: "Fehler",
      reportFailed: "Meldung fehlgeschlagen.",
      reportLabel: "Melden",
      placeholder: "Nachricht schreiben...",
      sendFailed: "Nachricht konnte nicht gesendet werden."
    },
    fr: {
      reportTitle: "Signaler et quitter",
      reportBody: "Le contact sera bloqué et la conversation supprimée.",
      cancel: "Annuler",
      report: "Signaler",
      reported: "Signalé",
      reportedBody: "Contact bloqué et conversation supprimée.",
      errorTitle: "Erreur",
      reportFailed: "Échec du signalement.",
      reportLabel: "Signaler",
      placeholder: "Écrire un message...",
      sendFailed: "Impossible d'envoyer le message."
    },
  ru: {
      reportTitle: "Пожаловаться и удалить чат",
      reportBody: "Мы заблокируем контакт и удалим чат.",
      cancel: "Отмена",
      report: "Пожаловаться",
      reported: "Жалоба отправлена",
      reportedBody: "Контакт заблокирован, чат завершён.",
      errorTitle: "Ошибка",
      reportFailed: "Не удалось отправить жалобу.",
      reportLabel: "Пожаловаться",
      placeholder: "Напишите сообщение...",
      sendFailed: "Не удалось отправить сообщение."
    }
  });
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
        Alert.alert(copy.errorTitle, error?.message ?? copy.sendFailed);
      }
    },
    [copy.errorTitle, copy.sendFailed, sendMessageMutation]
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
          <Ionicons name="send" size={18} color="#fff" />
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
      const color = read ? "#0d6e4f" : "#9ca3af";
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

  if (!session || isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
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
        name: message.senderId === session.user.id ? "Du" : "Match"
      }
    }));

  const currentMatch = matches.find((item) => item.id === matchId);
  const matchIsIncognito =
    headerMeta.isIncognito || Boolean(currentMatch?.otherIsIncognito || !currentMatch?.previewPhotoUrl);
  const matchName = headerMeta.name || currentMatch?.otherDisplayName || "Match";
  const matchPhoto = matchIsIncognito ? null : headerMeta.photo || currentMatch?.previewPhotoUrl || null;
  const isTyping = Boolean(typingMatches[matchId]);
  const online = currentMatch?.lastMessageAt
    ? Date.now() - new Date(currentMatch.lastMessageAt).getTime() < 5 * 60 * 1000
    : false;
  const statusText = isTyping
    ? "schreibt..."
    : online
    ? "Online"
    : currentMatch?.lastMessageAt
    ? `zuletzt aktiv ${new Date(currentMatch.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.topBarButton}>
          <Ionicons name="chevron-back" size={24} color="#94a3b8" />
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
        <View style={styles.topBarButtonRight} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
          minInputToolbarHeight={48}
          text={inputText}
          onInputTextChanged={setInputText}
          messagesContainerStyle={styles.messagesContainer}
          renderInputToolbar={renderInputToolbar}
          renderBubble={(bubbleProps) => (
            <Bubble
              {...bubbleProps}
              wrapperStyle={{
                left: { backgroundColor: "#f1f5f9" },
                right: { backgroundColor: "#0d6e4f" }
              }}
              textStyle={{
                left: { color: "#1f2937" },
                right: { color: "#fff" }
              }}
            />
          )}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  center: {
    alignItems: "center",
    justifyContent: "center"
  },
  messagesContainer: {
    paddingBottom: 6
  },
  chatBody: {
    flex: 1
  },
  inputToolbar: {
    borderTopWidth: 0,
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "#f8fafc"
  },
  inputPrimary: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0
  },
  textBubble: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    marginRight: 10,
    minHeight: 42,
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
  },
  composerInput: {
    flex: 1,
    color: "#0f172a",
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 0
  },
  sendButtonRound: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0d6e4f",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  sendButtonDisabled: {
    opacity: 0.45
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 16,
    paddingVertical: 16,
    minHeight: 86,
    backgroundColor: "#f8fafc"
  },
  topBarButton: {
    padding: 8
  },
  topBarButtonRight: {
    padding: 10
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2b2e31",
    maxWidth: 190
  },
  topBarSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    maxWidth: 190
  },
  topBarCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e2e8f0"
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e2e8f0"
  },
  bubbleAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e2e8f0",
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
