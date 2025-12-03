import "react-native-url-polyfill/auto";
import "./sentry";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "./components/ErrorBoundary";
import * as Notifications from "expo-notifications";
import { useNotificationsStore } from "./state/notificationsStore";
import AppNavigator from "./navigation/AppNavigator";
import { useAuthStore } from "./state/authStore";
import { bootstrapSession } from "./services/authService";
import { registerPushNotifications } from "./services/pushService";
import { track, flushEvents } from "./lib/analytics";
import { LocalizationProvider, determineLocaleFromDevice } from "./localization/LocalizationProvider";
import { getSupabaseClient } from "./lib/supabaseClient";

type NotificationCopy = {
  defaultTitle: string;
  defaultBody: string;
  matchTitle: string;
  matchBody: string;
  likeTitle: string;
  likeBody: string;
  messageTitle: string;
  messageBody: string;
};

const notificationCopy: Record<string, NotificationCopy> = {
  en: {
    defaultTitle: "Notification",
    defaultBody: "New notification",
    matchTitle: "New match",
    matchBody: "You can chat now.",
    likeTitle: "New like",
    likeBody: "Someone likes your profile.",
    messageTitle: "New message",
    messageBody: "You received a new message."
  },
  de: {
    defaultTitle: "Benachrichtigung",
    defaultBody: "Neue Benachrichtigung",
    matchTitle: "Neues Match",
    matchBody: "Ihr könnt jetzt chatten.",
    likeTitle: "Neues Like",
    likeBody: "Jemand mag dein Profil.",
    messageTitle: "Neue Nachricht",
    messageBody: "Du hast eine neue Nachricht."
  },
  fr: {
    defaultTitle: "Notification",
    defaultBody: "Nouvelle notification",
    matchTitle: "Nouveau match",
    matchBody: "Vous pouvez discuter maintenant.",
    likeTitle: "Nouveau like",
    likeBody: "Quelqu'un aime votre profil.",
    messageTitle: "Nouveau message",
    messageBody: "Vous avez reçu un nouveau message."
  },
  ru: {
    defaultTitle: "Уведомление",
    defaultBody: "Новое уведомление",
    matchTitle: "Новый матч",
    matchBody: "Можно начинать чат.",
    likeTitle: "Новый лайк",
    likeBody: "Кому-то понравился твой профиль.",
    messageTitle: "Новое сообщение",
    messageBody: "У тебя новое сообщение."
  }
};

const getNotificationCopy = (): NotificationCopy => {
  const locale = determineLocaleFromDevice();
  return notificationCopy[locale] ?? notificationCopy.en;
};

export const navigationRef = createNavigationContainerRef<any>();

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
  const addNotification = useNotificationsStore((state) => state.addNotification);
  const notifications = useNotificationsStore((state) => state.items);
  const hasUnseen = useNotificationsStore((state) => state.hasUnseen);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const notificationText = useMemo(() => getNotificationCopy(), []);

  useEffect(() => {
    let mounted = true;
    const bootstrapWithTimeout = async () => {
      const timeoutMs = 8000;
      return Promise.race([
        bootstrapSession().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
      ]);
    };

    const prepare = async () => {
      try {
        const nextSession = await bootstrapWithTimeout();
        if (mounted && nextSession) {
          setSession(nextSession);
        }
      } catch (error) {
        console.warn("Failed to bootstrap app", error);
      } finally {
        if (mounted) {
          setIsBootstrapped(true);
        }
      }

      // Non-blocking startup work
      void registerPushNotifications().catch((error) => {
        console.warn("Failed to register push notifications", error);
      });
      void (async () => {
        try {
          await track("app_open");
          await flushEvents();
        } catch (error) {
          console.warn("Failed to run analytics on startup", error);
        }
      })();
    };

    void prepare();
    return () => {
      mounted = false;
    };
  }, [setSession]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((event) => {
      const identifier = event.request.identifier || `push-${Date.now()}`;
      const type = event.request.content.data?.type?.toString().toLowerCase() ?? "";
      const payloadData = event.request.content.data ?? {};
      addNotification({
        id: identifier,
        title: event.request.content.title ?? notificationText.defaultTitle,
        body: event.request.content.body ?? notificationText.defaultBody,
        receivedAt: new Date().toISOString(),
        data: payloadData
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const event = response.notification;
      const identifier = event.request.identifier || `push-${Date.now()}`;
      const type = event.request.content.data?.type?.toString().toLowerCase() ?? "";
      const payloadData = event.request.content.data ?? {};
      addNotification({
        id: identifier,
        title: event.request.content.title ?? notificationText.defaultTitle,
        body: event.request.content.body ?? notificationText.defaultBody,
        receivedAt: new Date().toISOString(),
        data: payloadData
      });
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [addNotification, notificationText]);

  useEffect(() => {
    const badgeCount = hasUnseen ? notifications.length : 0;
    Notifications.setBadgeCountAsync(badgeCount).catch(() => undefined);
  }, [notifications, hasUnseen]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }
    const userId = session.user.id;
    const channel = supabase
      .channel(`notif-rt-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "push_queue",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row: any = payload.new ?? {};
          if (row.processed_at) {
            return;
          }
          const type = (row.type ?? "").toString();
          const data = (row.payload as Record<string, any>) ?? {};
          let title = notificationText.defaultTitle;
          let body = data.preview ?? data.body ?? notificationText.defaultBody;
          if (type === "match.new") {
            title = notificationText.matchTitle;
            body = notificationText.matchBody;
          } else if (type === "like.received") {
            title = notificationText.likeTitle;
            body = notificationText.likeBody;
          } else if (type === "message.new") {
            title = notificationText.messageTitle;
            body = data.preview ?? notificationText.messageBody;
          }

          addNotification({
            id: `rt-${row.id ?? Date.now()}`,
            title,
            body,
            receivedAt: new Date().toISOString(),
            data: {
              type,
              ...data,
            },
          });
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [addNotification, notificationText, session?.user?.id, supabase]);

  if (!isBootstrapped) {
    return (
      <LocalizationProvider>
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
      </LocalizationProvider>
    );
  }

  return (
    <LocalizationProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer ref={navigationRef}>
                <StatusBar style="dark" />
                <AppNavigator isAuthenticated={Boolean(session)} />
              </NavigationContainer>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </LocalizationProvider>
  );
};

export default App;
