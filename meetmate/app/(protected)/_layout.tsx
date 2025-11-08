import React from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import {
  selectIsHydrated,
  selectSession,
  useSessionStore,
} from "../../store/sessionStore";

const ProtectedLayout = (): JSX.Element => {
  const session = useSessionStore(selectSession);
  const isHydrated = useSessionStore(selectIsHydrated);

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default ProtectedLayout;
