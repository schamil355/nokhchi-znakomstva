import React, { useCallback, useEffect, useLayoutEffect } from "react";
import { ActivityIndicator, View, Alert, Pressable, Text } from "react-native";
import { GiftedChat, IMessage } from "react-native-gifted-chat";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMessages } from "../hooks/useMessages";
import { useSendMessage } from "../hooks/useMatches";
import { useAuthStore } from "../state/authStore";
import { useChatStore } from "../state/chatStore";
import { markMessagesAsRead } from "../services/matchService";
import { reportUser } from "../services/moderationService";

type Props = NativeStackScreenProps<any>;

const ChatScreen = ({ route, navigation }: Props) => {
  const { matchId, participantId } = route.params ?? {};
  const session = useAuthStore((state) => state.session);
  const setUnread = useChatStore((state) => state.setUnread);
  const { messages, isLoading } = useMessages(matchId);
  const sendMessageMutation = useSendMessage(matchId);

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

  const handleReport = useCallback(() => {
    if (!session?.user?.id || !participantId) {
      return;
    }
    Alert.alert(
      "Melden & Chat beenden",
      "Der Kontakt wird blockiert und der Chat gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Melden",
          style: "destructive",
          onPress: async () => {
            try {
              await reportUser(session.user.id, participantId, "abuse");
              navigation.goBack();
              Alert.alert("Gemeldet", "Kontakt wurde blockiert und der Chat beendet.");
            } catch (error: any) {
              Alert.alert("Fehler", error.message ?? "Meldung fehlgeschlagen.");
            }
          }
        }
      ]
    );
  }, [navigation, participantId, session?.user?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleReport} style={{ marginRight: 12 }}>
          <Text style={{ color: "#eb5757", fontWeight: "600" }}>Melden</Text>
        </Pressable>
      )
    });
  }, [handleReport, navigation]);

  const onSend = useCallback(
    async (items: IMessage[] = []) => {
      const [message] = items;
      if (!message?.text) {
        return;
      }
      await sendMessageMutation.mutateAsync(message.text);
    },
    [sendMessageMutation]
  );

  if (!session || isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
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
      user: {
        _id: message.senderId,
        name: message.senderId === session.user.id ? "Du" : "Match"
      }
    }));

  return (
    <GiftedChat
      messages={giftedMessages}
      onSend={onSend}
      user={{
        _id: session.user.id
      }}
      placeholder="Nachricht schreiben..."
      isLoadingEarlier={isLoading || sendMessageMutation.isPending}
      showUserAvatar={false}
      alwaysShowSend
    />
  );
};

export default ChatScreen;
