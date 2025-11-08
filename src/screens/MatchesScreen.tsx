import React from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMatches } from "../hooks/useMatches";
import { useAuthStore } from "../state/authStore";
import { Match } from "../types";
import { useChatStore } from "../state/chatStore";

const MatchesScreen = () => {
  const { data: matches = [], isLoading, refetch } = useMatches();
  const session = useAuthStore((state) => state.session);
  const navigation = useNavigation<any>();
  const unread = useChatStore((state) => state.unreadCounts);

  const renderMatch = ({ item }: { item: Match }) => {
    const otherParticipant = item.participants.find((participant) => participant !== session?.user.id) ?? item.participants[0];
    return (
      <Pressable
        style={styles.matchRow}
        onPress={() => navigation.navigate("Chat", { matchId: item.id, participantId: otherParticipant })}
      >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.participants[0]?.slice(0, 2)?.toUpperCase() ?? "??"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.matchTitle}>Match #{item.id.slice(0, 6)}</Text>
        <Text style={styles.matchSubtitle}>
          Zuletzt aktiv {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : "gerade eben"}
        </Text>
      </View>
      {unread[item.id] ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread[item.id]}</Text>
        </View>
      ) : null}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item) => item.id}
      renderItem={renderMatch}
      contentContainerStyle={matches.length ? undefined : styles.center}
      refreshing={isLoading}
      onRefresh={refetch}
      ListEmptyComponent={<Text style={styles.emptyText}>Noch keine Matches – sende ein paar Likes!</Text>}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#eee"
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  matchSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2f5d62",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  avatarText: {
    color: "#fff",
    fontWeight: "600"
  },
  emptyText: {
    fontSize: 16,
    color: "#666"
  },
  badge: {
    backgroundColor: "#eb5757",
    borderRadius: 12,
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: "center"
  },
  badgeText: {
    color: "#fff",
    fontWeight: "600"
  }
});

export default MatchesScreen;
