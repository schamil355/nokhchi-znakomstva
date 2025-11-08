import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const Button = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  testID,
  style,
}: ButtonProps) => {
  const { colors, radius, spacing } = useTheme();

  const backgroundByVariant: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.surface,
    ghost: "transparent",
  };

  const borderByVariant: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.border,
    ghost: "transparent",
  };

  const textColorByVariant: Record<ButtonVariant, string> = {
    primary: colors.primaryText,
    secondary: colors.text,
    ghost: colors.primary,
  };

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: backgroundByVariant[variant],
          borderColor: borderByVariant[variant],
          borderRadius: radius.md,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          paddingVertical: spacing(1.25),
          paddingHorizontal: spacing(2),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColorByVariant[variant]} />
      ) : (
        <Text style={[styles.title, { color: textColorByVariant[variant] }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
  },
});

export default Button;
