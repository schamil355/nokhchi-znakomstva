import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type AvatarProps = {
  uri?: string | null;
  label?: string;
  size?: number;
  testID?: string;
};

const Avatar = ({ uri, label, size = 48, testID }: AvatarProps) => {
  const { colors } = useTheme();
  const initials =
    label
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "M";

  if (uri) {
    return (
      <Image
        testID={testID}
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accent + "22",
          borderColor: colors.accent,
        },
      ]}
    >
      <Text style={[styles.initials, { color: colors.accent }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontWeight: "700",
  },
});

export default Avatar;
