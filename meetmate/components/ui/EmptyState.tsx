import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import Button from "./Button";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
};

const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) => {
  const { colors, spacing, typography } = useTheme();
  return (
    <View testID={testID} style={[styles.container, { padding: spacing(3) }]}>
      <Text style={[typography.heading, { textAlign: "center", color: colors.text }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[typography.subtitle, styles.description]}>{description}</Text>
      ) : null}
      {actionLabel ? (
        <Button title={actionLabel} onPress={onAction} variant="primary" />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  description: {
    textAlign: "center",
  },
});

export default EmptyState;
