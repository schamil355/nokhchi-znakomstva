import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type EmptyFeedProps = {
  onIncreaseRadius: () => void;
  onResetFilters: () => void;
  onRetry: () => void;
  onInviteFriends?: () => void;
};

const EmptyFeed = ({ onIncreaseRadius, onResetFilters, onRetry, onInviteFriends }: EmptyFeedProps) => (
  <View style={styles.container}>
    <Text style={styles.title}>Keine neuen Vorschläge</Text>
    <Text style={styles.subtitle}>
      Passe deine Filter an oder versuche es später erneut, um mehr Profile zu sehen.
    </Text>
    <View style={styles.actions}>
      <PrimaryButton label="Radius erhöhen" onPress={onIncreaseRadius} />
      <PrimaryButton label="Filter zurücksetzen" onPress={onResetFilters} variant="outline" />
      <PrimaryButton label="Später erneut versuchen" onPress={onRetry} />
      {onInviteFriends ? (
        <Pressable style={styles.invite} onPress={onInviteFriends}>
          <Text style={styles.inviteText}>Freunde einladen</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);

const PrimaryButton = ({
  label,
  onPress,
  variant = "solid"
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.button, variant === "outline" ? styles.buttonOutline : styles.buttonSolid]}
  >
    <Text style={[styles.buttonText, variant === "outline" && styles.buttonTextOutline]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center"
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666"
  },
  actions: {
    width: "100%",
    gap: 12
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1
  },
  buttonSolid: {
    backgroundColor: "#2f5d62",
    borderColor: "#2f5d62"
  },
  buttonOutline: {
    backgroundColor: "#fff",
    borderColor: "#2f5d62"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },
  buttonTextOutline: {
    color: "#2f5d62"
  },
  invite: {
    paddingVertical: 12,
    alignItems: "center"
  },
  inviteText: {
    color: "#2f5d62",
    fontWeight: "600"
  }
});

export default EmptyFeed;
