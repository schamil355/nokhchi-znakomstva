import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack, useSegments } from "expo-router";
import {
  selectIsHydrated,
  selectSession,
  useSessionStore,
} from "../../store/sessionStore";

const AuthLayout = (): JSX.Element => {
  const session = useSessionStore(selectSession);
  const isHydrated = useSessionStore(selectIsHydrated);
  const segments = useSegments();

  const isMagicLinkFlow = segments[segments.length - 1] === "magic-link-confirm";

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (session && !isMagicLinkFlow) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default AuthLayout;
