import "react-native-url-polyfill/auto";
import "react-native-url-polyfill/mediasource";
import "./sentry";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "./components/ErrorBoundary";
import AppNavigator from "./navigation/AppNavigator";
import { useAuthStore } from "./state/authStore";
import { bootstrapSession } from "./services/authService";
import { registerPushNotifications } from "./services/pushService";
import { track, flushEvents } from "./lib/analytics";

const App = (): JSX.Element => {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            gcTime: 120_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true
          },
          mutations: {
            retry: 0
          }
        }
      }),
    []
  );

  const setSession = useAuthStore((state) => state.setSession);
  const session = useAuthStore((state) => state.session);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      try {
        const nextSession = await bootstrapSession();
        if (mounted && nextSession) {
          setSession(nextSession);
        }
        await registerPushNotifications();
        await track("app_open");
        await flushEvents();
      } catch (error) {
        console.warn("Failed to bootstrap app", error);
      } finally {
        if (mounted) {
          setIsBootstrapped(true);
        }
      }
    };

    prepare();
    return () => {
      mounted = false;
    };
  }, [setSession]);

  if (!isBootstrapped) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fff"
            }}
          >
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <StatusBar style="dark" />
              <AppNavigator isAuthenticated={Boolean(session)} />
            </NavigationContainer>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
