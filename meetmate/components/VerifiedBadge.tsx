import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "../lib/i18n";

type VerifiedBadgeProps = {
  label?: string;
};

const VerifiedBadge = ({ label }: VerifiedBadgeProps) => {
  const { t } = useTranslation();
  return (
    <View style={styles.badge} testID="verified-badge">
      <Text style={styles.text}>{label ?? t("verification.badge.verified")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#2563eb1a",
  },
  text: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 12,
  },
});

export default VerifiedBadge;
