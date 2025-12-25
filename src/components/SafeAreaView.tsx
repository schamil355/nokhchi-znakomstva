import React from "react";
import { StyleProp, ViewStyle, useWindowDimensions } from "react-native";
import { SafeAreaView as BaseSafeAreaView, type Edge } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  topPadding?: number;
  bottomPadding?: number;
};

const SafeAreaView = ({ children, style, edges = ["top", "left", "right", "bottom"], topPadding, bottomPadding }: Props) => {
  const { height } = useWindowDimensions();
  const baseTop = topPadding ?? Math.round(Math.min(20, Math.max(8, height * 0.015)));
  const baseBottom = bottomPadding ?? Math.round(Math.min(16, Math.max(8, height * 0.012)));
  const hasTop = edges.includes("top");
  const hasBottom = edges.includes("bottom");

  return (
    <BaseSafeAreaView
      edges={edges}
      style={[
        {
          paddingTop: hasTop ? baseTop : 0,
          paddingBottom: hasBottom ? baseBottom : 0
        },
        style
      ]}
    >
      {children}
    </BaseSafeAreaView>
  );
};

export default SafeAreaView;
