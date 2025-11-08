import React, { PropsWithChildren, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSupabaseAuthSync } from "../features/auth/session";
import { usePushNotifications } from "../lib/notifications";
import { useSessionStore } from "../store/sessionStore";
import { setSentryUser } from "../lib/sentry";
import { configureRevenueCat } from "../lib/revenuecat";
import { useEntitlementLifecycleSync } from "../features/paywall/sync";
import { ThemeProvider } from "./theme/ThemeProvider";
import ToastProvider from "./ToastProvider";
import ErrorBoundary from "./ErrorBoundary";
import { initI18n, syncLocale } from "../lib/i18n";

const EntitlementSyncBridge = (): null => {
  useEntitlementLifecycleSync();
  return null;
};

const Providers = ({ children }: PropsWithChildren): JSX.Element => {
  const [i18nReady, setI18nReady] = useState(false);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 30000,
            gcTime: 5 * 60 * 1000,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  useSupabaseAuthSync();
  usePushNotifications();
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    let mounted = true;
    initI18n()
      .catch((error) => {
        console.warn("Failed to initialize i18n", error);
      })
      .finally(() => {
        if (mounted) {
          setI18nReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      setSentryUser({ id: user.id, email: user.email });
    } else {
      setSentryUser(null);
    }
    configureRevenueCat(user?.id).catch((error) => {
      console.warn("RevenueCat configure failed", error);
    });
    syncLocale().catch((error) => {
      console.warn("Failed to sync locale", error);
    });
  }, [user]);

  if (!i18nReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <EntitlementSyncBridge />
            <ToastProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </ToastProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

export default Providers;
