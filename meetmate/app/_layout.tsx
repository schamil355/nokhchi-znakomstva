import React, { useEffect } from "react";
import { Stack, Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import Providers from "../components/Providers";
import { initSentry } from "../lib/sentry";
import { selectSession, useSessionStore } from "../store/sessionStore";
import { useProfileCompletion } from "../features/auth/onboarding";
import { useTranslation } from "../lib/i18n";
import { useEntitlements } from "../features/paywall/hooks";

const AuthenticatedTabs = () => {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="discovery" options={{ title: t("tabs.discovery") }} />
      <Tabs.Screen name="matches" options={{ title: t("tabs.matches") }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile") }} />
      <Tabs.Screen name="paywall" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
    </Tabs>
  );
};

const RootLayoutInner = (): JSX.Element => {
  const session = useSessionStore(selectSession);
  const { isComplete, isLoading } = useProfileCompletion();
  const { isSubscribed, isLoading: entitlementsLoading } = useEntitlements();
  const { t } = useTranslation();

  if (!session) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  if (isLoading || entitlementsLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>{t("profile.loadingProfile")}</Text>
      </View>
    );
  }

  if (!isSubscribed) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
      </Stack>
    );
  }

  if (!isComplete) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="profile/create" options={{ presentation: "modal" }} />
      </Stack>
    );
  }

  return <AuthenticatedTabs />;
};

const RootLayout = (): JSX.Element => {
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <Providers>
      <StatusBar style="auto" />
      <RootLayoutInner />
    </Providers>
  );
};

export default RootLayout;
