import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  testID?: string;
};

const Chip = ({ label, selected = false, onPress, icon, testID }: ChipProps) => {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? colors.primary + "22" : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radius.md,
        },
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.label, { color: selected ? colors.primary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default Chip;
