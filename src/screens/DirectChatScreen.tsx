import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { GiftedChat, IMessage, Bubble, InputToolbar, Send, Composer } from "react-native-gifted-chat";
import { Ionicons } from "@expo/vector-icons";
import { useDirectMessages } from "../hooks/useDirectMessages";
import { useAuthStore } from "../state/authStore";
import { useLocalizedCopy } from "../localization/LocalizationProvider";
import { fetchProfile } from "../services/profileService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSupabaseClient } from "../lib/supabaseClient";
import { getPhotoUrl } from "../lib/storage";
import { LinearGradient } from "expo-linear-gradient";

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

const DirectChatScreen = ({ route, navigation }: Props) => {
  const { conversationId, otherUserId } = route.params ?? {};
  const copy = useLocalizedCopy({
    de: {
      placeholder: "Nachricht schreiben...",
      sendFailed: "Nachricht konnte nicht gesendet werden.",
      back: "Zurück",
      missing: "Chat konnte nicht geöffnet werden."
    },
    en: {
      placeholder: "Type a message...",
      sendFailed: "Message could not be sent.",
      back: "Back",
      missing: "Unable to open chat."
    }
  });
  const session = useAuthStore((state) => state.session);
  const viewerProfile = useAuthStore((state) => state.profile);
  const { messages, isLoading, sendMessage } = useDirectMessages(conversationId ?? "");
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [otherAvatarUri, setOtherAvatarUri] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const insets = useSafeAreaInsets();
  const supabase = useMemo(() => getSupabaseClient(), []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!conversationId || !otherUserId) {
      Alert.alert(copy.missing);
      navigation.goBack();
      return;
    }
    fetchProfile(otherUserId).then(setOtherProfile).catch(() => setOtherProfile(null));
  }, [conversationId, copy.missing, navigation, otherUserId]);

  const selfAvatar = viewerProfile?.photos?.[0]?.url ?? null;
  const profilePhotoUrl = otherProfile?.photos?.[0]?.url ?? null;

  useEffect(() => {
    let isMounted = true;
    const resolveAvatar = async () => {
      const candidates: (string | null | undefined)[] = [
        profilePhotoUrl && /^https?:\/\//.test(profilePhotoUrl) ? profilePhotoUrl : null,
        otherProfile?.primaryPhotoPath,
        otherProfile?.photos?.[0]?.storagePath,
        profilePhotoUrl && !/^https?:\/\//.test(profilePhotoUrl) ? profilePhotoUrl : null,
        otherProfile?.photos?.[0]?.url && !/^https?:\/\//.test(otherProfile.photos[0].url) ? otherProfile.photos[0].url : null
      ].filter(Boolean);

      for (const candidate of candidates as string[]) {
        try {
          if (/^https?:\/\//.test(candidate)) {
            setOtherAvatarUri(candidate);
            return;
          }
          const signed = await getPhotoUrl(candidate, supabase);
          if (isMounted && signed) {
            setOtherAvatarUri(signed);
            return;
          }
        } catch (err) {
          console.warn("DirectChat avatar lookup failed for candidate", candidate, err);
        }
      }
      if (isMounted) setOtherAvatarUri(null);
    };
    resolveAvatar();
    return () => {
      isMounted = false;
    };
  }, [profilePhotoUrl, otherProfile?.primaryPhotoPath, otherProfile?.photos, supabase]);

  const giftedMessages: IMessage[] = useMemo(
    () =>
      messages
        .map((message) => ({
          _id: message.id,
          text: message.content,
          createdAt: new Date(message.createdAt),
          user: {
            _id: message.senderId,
            avatar: message.senderId === session?.user?.id ? selfAvatar : otherAvatarUri
          }
        }))
        .reverse(),
    [messages, otherAvatarUri, selfAvatar, session?.user?.id]
  );

  const onSend = useCallback(
    async (items: IMessage[] = []) => {
      const [message] = items;
      const content = message?.text?.trim();
      if (!content) return;
      try {
        await sendMessage(content);
        setInputText("");
      } catch (error: any) {
        Alert.alert(copy.sendFailed, error?.message ?? copy.sendFailed);
      }
    },
    [copy.sendFailed, sendMessage]
  );

  const headerName = otherProfile?.displayName ?? "";
  const headerPhoto = otherAvatarUri;

  const renderComposer = useCallback(
    (composerProps: any) => {
      const handleChangeText = (text: string) => {
        setInputText(text);
        composerProps?.onTextChanged?.(text);
      };
      const maxLength =
        composerProps?.textInputProps?.maxLength && composerProps.textInputProps.maxLength > 0
          ? composerProps.textInputProps.maxLength
          : undefined;
      return (
        <View style={styles.textBubble}>
          <Composer
            {...composerProps}
            text={composerProps.text ?? inputText}
            onTextChanged={handleChangeText}
            placeholder={copy.placeholder}
            textInputStyle={styles.composerInput}
            textInputProps={{
              ...composerProps.textInputProps,
              maxLength,
              placeholder: copy.placeholder,
              placeholderTextColor: "#9ca3af",
              multiline: true,
              enablesReturnKeyAutomatically: true,
              underlineColorAndroid: "transparent"
            }}
          />
        </View>
      );
    },
    [copy.placeholder, inputText]
  );

  const renderSend = useCallback(
    (props: any) => {
      const disabled = !props.text || !props.text.trim();
      return (
        <Send
          {...props}
          disabled={disabled}
          containerStyle={[styles.sendButtonRound, disabled && styles.sendButtonDisabled]}
        >
          <LinearGradient
            colors={[PALETTE.clay, PALETTE.pine]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendButtonInner}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </LinearGradient>
        </Send>
      );
    },
    []
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

  return (
    <LinearGradient colors={[PALETTE.deep, PALETTE.forest, "#0b1a12"]} locations={[0, 0.55, 1]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoider}
          behavior={Platform.OS === "ios" ? undefined : "height"}
          keyboardVerticalOffset={insets.top + 6}
        >
          <View style={styles.header}>
            <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Ionicons name="chevron-back" size={24} color={PALETTE.sand} />
            </Pressable>
            <View style={styles.headerMeta}>
              {headerPhoto ? (
                <Image source={{ uri: headerPhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar} />
              )}
              <Text style={styles.headerTitle} numberOfLines={1}>
                {headerName}
              </Text>
            </View>
            <View style={{ width: 30 }} />
          </View>
          <GiftedChat
            messages={giftedMessages}
            onSend={onSend}
            user={{ _id: session?.user?.id ?? "me" }}
            isLoadingEarlier={isLoading}
            placeholder={copy.placeholder}
            showUserAvatar={false}
            keyboardShouldPersistTaps="handled"
            messagesContainerStyle={styles.messagesContainer}
            text={inputText}
            onInputTextChanged={setInputText}
            minComposerHeight={44}
            minInputToolbarHeight={54}
            renderInputToolbar={renderInputToolbar}
            renderAvatar={(props) => {
              const isOwn = props.currentMessage?.user?._id === session?.user?.id;
              if (isOwn) return null;
              const avatarUri = props.currentMessage?.user?.avatar as string | undefined;
              const initials = otherProfile?.displayName?.[0] ?? "U";
              if (avatarUri) {
                return <Image source={{ uri: avatarUri }} style={styles.bubbleAvatar} />;
              }
              return (
                <View style={styles.bubbleAvatarFallback}>
                  <Text style={styles.bubbleAvatarText}>{initials}</Text>
                </View>
              );
            }}
            renderBubble={(props) => (
              <Bubble
                {...props}
                wrapperStyle={{
                  left: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(217,192,143,0.15)" },
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
            alwaysShowSend
            bottomOffset={insets.bottom}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "transparent" },
  keyboardAvoider: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(217,192,143,0.18)",
    backgroundColor: "rgba(0,0,0,0.12)"
  },
  headerButton: { padding: 6 },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: PALETTE.sand },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.1,
    borderColor: "rgba(217,192,143,0.4)"
  },
  messagesContainer: {
    paddingBottom: 6,
    backgroundColor: "transparent"
  },
  inputToolbar: {
    borderTopWidth: 0,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: "transparent",
    borderRadius: 18,
    marginHorizontal: 10,
    marginBottom: 0,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "transparent",
    borderWidth: 1.4,
    borderColor: PALETTE.gold,
    overflow: "hidden",
    padding: 2,
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
  sendButtonInner: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  bubbleAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 6 },
  bubbleAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  bubbleAvatarText: { color: PALETTE.sand, fontWeight: "700" }
});

export default DirectChatScreen;
