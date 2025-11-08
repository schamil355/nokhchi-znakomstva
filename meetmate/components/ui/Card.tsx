import React, { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type CardProps = PropsWithChildren<{
  onPress?: () => void;
  padding?: number;
  testID?: string;
}>;

const Card = ({ children, onPress, padding = 16, testID }: CardProps) => {
  const { colors, radius } = useTheme();

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding,
        },
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={styles.wrapper}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  pressable: {
    width: "100%",
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
});

export default Card;
