import "react-native-url-polyfill/auto";
import "./sentry";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ErrorBoundary from "./components/ErrorBoundary";
import * as Notifications from "expo-notifications";
import { useNotificationsStore } from "./state/notificationsStore";
import AppNavigator from "./navigation/AppNavigator";
import { useAuthStore } from "./state/authStore";
import { useOnboardingStore } from "./state/onboardingStore";
import { bootstrapSession } from "./services/authService";
import { registerPushNotifications } from "./services/pushService";
import { track, flushEvents } from "./lib/analytics";
import { LocalizationProvider, determineLocaleFromDevice } from "./localization/LocalizationProvider";
import { getSupabaseClient } from "./lib/supabaseClient";
import { configureRevenueCat } from "./lib/revenuecat";
import PwaInstallBanner from "./components/PwaInstallBanner";
import { registerServiceWorker } from "./lib/pwa";

type NotificationCopy = {
  defaultTitle: string;
  defaultBody: string;
  matchTitle: string;
  matchBody: string;
  likeTitle: string;
  likeBody: string;
  likeBodyWithName?: (name: string) => string;
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
    likeBody: "Someone liked you.",
    likeBodyWithName: (name: string) => `${name} liked you.`,
    messageTitle: "New message",
    messageBody: "You received a new message."
  },
  de: {
    defaultTitle: "Benachrichtigung",
    defaultBody: "Neue Benachrichtigung",
    matchTitle: "Neues Match",
    matchBody: "Ihr könnt jetzt chatten.",
    likeTitle: "Neues Like",
    likeBody: "Jemand hat dich geliket",
    likeBodyWithName: (name: string) => `${name} hat dich geliket`,
    messageTitle: "Neue Nachricht",
    messageBody: "Du hast eine neue Nachricht."
  },
  fr: {
    defaultTitle: "Notification",
    defaultBody: "Nouvelle notification",
    matchTitle: "Nouveau match",
    matchBody: "Vous pouvez discuter maintenant.",
    likeTitle: "Nouveau like",
    likeBody: "Quelqu'un t'a liké.",
    likeBodyWithName: (name: string) => `${name} t'a liké.`,
    messageTitle: "Nouveau message",
    messageBody: "Vous avez reçu un nouveau message."
  },
  ru: {
    defaultTitle: "Уведомление",
    defaultBody: "Новое уведомление",
    matchTitle: "Новый матч",
    matchBody: "Можно начинать чат.",
    likeTitle: "Новый лайк",
    likeBody: "Тебя лайкнули.",
    likeBodyWithName: (name: string) => `${name} поставил лайк.`,
    messageTitle: "Новое сообщение",
    messageBody: "У тебя новое сообщение."
  }
};

const getNotificationCopy = (): NotificationCopy => {
  const locale = determineLocaleFromDevice();
  return notificationCopy[locale] ?? notificationCopy.en;
};

export const navigationRef = createNavigationContainerRef<any>();

const ONBOARDING_ROUTES = new Set<string>([
  "Welcome",
  "SignIn",
  "RegisterChoice",
  "CreateAccount",
  "EmailPending",
  "OnboardingGender",
  "OnboardingName",
  "OnboardingBirthday",
  "OnboardingNotifications",
  "OnboardingLocation",
  "OnboardingPhotos",
  "OnboardingVerify",
  "OnboardingVerifySuccess",
  "SelfieScan",
  "OnboardingNext"
]);

const LAST_ONBOARDING_KEY = "onboarding:lastRoute";
const ONBOARDING_RESUME_ENABLED = false;
const CANONICAL_HOST = "www.nokhchi-znakomstva.com";

const isLikelyInAppBrowser = (ua: string) =>
  /(FBAN|FBAV|Instagram|Line|Twitter|LinkedInApp|Pinterest|Snapchat|WhatsApp|Messenger|GSA|GoogleApp|Gmail|GmailiOS|KAKAOTALK|KAKAOSTORY|NAVER|YaBrowser|DuckDuckGo)/i.test(
    ua
  );
const LEGACY_SESSION_KEYS = ["sb.session"];

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
  const setAuthNotice = useAuthStore((state) => state.setAuthNotice);
  const clearAuthNotice = useAuthStore((state) => state.clearAuthNotice);
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const verifiedOverride = useAuthStore((state) => state.verifiedOverride);
  const showVerifySuccess = useOnboardingStore((state) => state.showVerifySuccess);
  const addNotification = useNotificationsStore((state) => state.addNotification);
  const notifications = useNotificationsStore((state) => state.items);
  const hasUnseen = useNotificationsStore((state) => state.hasUnseen);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const notificationText = useMemo(() => getNotificationCopy(), []);
  const [navReady, setNavReady] = useState(false);
  const pendingNavigationRef = useRef<{ name: string; params?: any } | null>(null);
  const [lastOnboardingRoute, setLastOnboardingRoute] = useState<string | null>(null);
  const hasAppliedOnboardingRouteRef = useRef(false);

  const isVerified = Boolean(profile?.verified) || verifiedOverride;
  const needsOnboarding = !profile || !isVerified;
  const shouldStayInOnboarding = !session || needsOnboarding || showVerifySuccess;
  const canResumeOnboarding = Boolean(session) && (needsOnboarding || showVerifySuccess);

  useEffect(() => {
    if (!ONBOARDING_RESUME_ENABLED) {
      return;
    }
    void AsyncStorage.getItem(LAST_ONBOARDING_KEY)
      .then((value) => {
        if (value && ONBOARDING_ROUTES.has(value)) {
          setLastOnboardingRoute(value);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ONBOARDING_RESUME_ENABLED) {
      return;
    }
    if (session || !lastOnboardingRoute) {
      return;
    }
    hasAppliedOnboardingRouteRef.current = false;
    void AsyncStorage.removeItem(LAST_ONBOARDING_KEY)
      .then(() => setLastOnboardingRoute(null))
      .catch(() => undefined);
  }, [lastOnboardingRoute, session]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const cleanupLegacyWebSession = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const legacySupabaseKeys = keys.filter(
          (key) => LEGACY_SESSION_KEYS.includes(key) || /^sb-.*-auth-token$/i.test(key)
        );
        const keysToRemove = new Set<string>([...legacySupabaseKeys, LAST_ONBOARDING_KEY]);
        if (keysToRemove.size) {
          await AsyncStorage.multiRemove(Array.from(keysToRemove));
        }
      } catch {
        // ignore cleanup errors
      }
    };
    void cleanupLegacyWebSession();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    if (window.location.hostname !== CANONICAL_HOST) {
      const target = `https://${CANONICAL_HOST}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(target);
    }
  }, []);

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
      if (Platform.OS !== "web") {
        void registerPushNotifications().catch((error) => {
          console.warn("Failed to register push notifications", error);
        });
      }
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
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    if (window.location.hostname !== CANONICAL_HOST) {
      return;
    }
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const errorParam = url.searchParams.get("error") ?? hashParams.get("error");
    const tokenHash =
      url.searchParams.get("token_hash") ??
      url.searchParams.get("token") ??
      hashParams.get("token_hash") ??
      hashParams.get("token");
    const otpType = url.searchParams.get("type") ?? hashParams.get("type");
    const hasAuthParams = Boolean(code || (accessToken && refreshToken) || (tokenHash && otpType) || errorParam);
    if (!hasAuthParams) {
      return;
    }

    const applyAuthFromUrl = async () => {
      const inAppBrowser = isLikelyInAppBrowser(window.navigator?.userAgent ?? "");
      let didSetSession = false;
      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn("[Auth] exchangeCodeForSession failed", error);
          } else if (data.session) {
            setSession(data.session);
            clearAuthNotice();
            didSetSession = true;
          }
        } else if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) {
            console.warn("[Auth] setSession from URL failed", error);
          } else if (data.session) {
            setSession(data.session);
            clearAuthNotice();
            didSetSession = true;
          }
        } else if (tokenHash && otpType) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as any
          });
          if (error) {
            console.warn("[Auth] verifyOtp failed", error);
          } else if (data.session) {
            setSession(data.session);
            clearAuthNotice();
            didSetSession = true;
          }
        }
        const bootstrapped = await bootstrapSession();
        if (!didSetSession && bootstrapped) {
          clearAuthNotice();
          didSetSession = true;
        }
        if (!didSetSession) {
          setAuthNotice({ type: "confirm_failed", inAppBrowser });
        }
      } catch (error) {
        console.warn("[Auth] URL session bootstrap failed", error);
        setAuthNotice({ type: "confirm_failed", inAppBrowser });
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    void applyAuthFromUrl();
  }, [clearAuthNotice, setAuthNotice, setSession, supabase]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    const receivedSub = Notifications.addNotificationReceivedListener((event) => {
      const identifier = event.request.identifier || `push-${Date.now()}`;
      const type = event.request.content.data?.type?.toString().toLowerCase() ?? "";
      const payloadData = event.request.content.data ?? {};
      if (type === "like.received") {
        return;
      }
      addNotification({
        id: identifier,
        title: event.request.content.title ?? notificationText.defaultTitle,
        body: event.request.content.body ?? notificationText.defaultBody,
        receivedAt: new Date().toISOString(),
        data: {
          type,
          ...payloadData
        }
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const event = response.notification;
      const identifier = event.request.identifier || `push-${Date.now()}`;
      const type = event.request.content.data?.type?.toString().toLowerCase() ?? "";
      const payloadData = event.request.content.data ?? {};
      if (type === "like.received") {
        return;
      }
      addNotification({
        id: identifier,
        title: event.request.content.title ?? notificationText.defaultTitle,
        body: event.request.content.body ?? notificationText.defaultBody,
        receivedAt: new Date().toISOString(),
        data: {
          type,
          ...payloadData
        }
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

  // If navigation isn't ready when a redirect arrives, replay it once ready.
  useEffect(() => {
    if (navReady && pendingNavigationRef.current && navigationRef.isReady()) {
      const target = pendingNavigationRef.current;
      navigationRef.reset({
        index: 0,
        routes: [target as any]
      });
      pendingNavigationRef.current = null;
    }
  }, [navReady]);

  // Persist the last visited onboarding route on navigation changes.
  const handleNavStateChange = useCallback(() => {
    if (!ONBOARDING_RESUME_ENABLED) return;
    if (!session) return;
    const route = navigationRef.getCurrentRoute();
    const name = route?.name;
    if (name && ONBOARDING_ROUTES.has(name)) {
      void AsyncStorage.setItem(LAST_ONBOARDING_KEY, name).catch(() => undefined);
    }
  }, [session]);

  // RevenueCat initialisieren, sobald eine Session verfügbar ist.
  useEffect(() => {
    void configureRevenueCat(session?.user?.id);
  }, [session?.user?.id]);

  // Navigate back to the last onboarding screen when applicable.
  useEffect(() => {
    if (!ONBOARDING_RESUME_ENABLED) return;
    if (!navReady || !navigationRef.isReady()) return;
    if (hasAppliedOnboardingRouteRef.current) return;
    if (!shouldStayInOnboarding || !canResumeOnboarding) return;
    if (lastOnboardingRoute && ONBOARDING_ROUTES.has(lastOnboardingRoute)) {
      navigationRef.navigate("Auth", { screen: lastOnboardingRoute });
      hasAppliedOnboardingRouteRef.current = true;
    }
  }, [canResumeOnboarding, lastOnboardingRoute, navReady, shouldStayInOnboarding]);

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
          let type = (row.type ?? "").toString();
          const data = (row.payload as Record<string, any>) ?? {};
          const currentUserId = session?.user?.id ?? null;
          if (type === "message.new") {
            const handleMessageNotification = async () => {
              const messageIdRaw = data.message_id ?? data.messageId ?? null;
              const messageId = messageIdRaw !== null && messageIdRaw !== undefined ? String(messageIdRaw) : null;
              let senderId = data.sender_id ?? data.senderId ?? data.sender ?? null;

              if ((!senderId || !data.preview) && messageId) {
                try {
                  const { data: msgRow } = await supabase
                    .from("messages")
                    .select("sender_id, content, created_at")
                    .eq("id", messageId)
                    .maybeSingle();
                  senderId = senderId ?? (msgRow as any)?.sender_id ?? null;
                  if (!data.preview && msgRow?.content) {
                    data.preview = msgRow.content;
                  }
                  if (!data.created_at && msgRow?.created_at) {
                    data.created_at = msgRow.created_at;
                  }
                } catch {
                  // ignore fetch errors
                }
              }

              if (senderId && currentUserId && senderId === currentUserId) {
                return;
              }

              const title = notificationText.messageTitle;
              const body = data.preview ?? notificationText.messageBody;
              const normalizedMessageId =
                messageId ??
                (data.message_id ?? data.messageId ? String(data.message_id ?? data.messageId) : null);

              addNotification({
                id: `message-${normalizedMessageId ?? row.id ?? Date.now()}`,
                title,
                body,
                receivedAt: new Date().toISOString(),
                data: {
                  type,
                  message_id: normalizedMessageId,
                  ...data,
                },
              });
            };

            void handleMessageNotification();
            return;
          }
          const isIncognitoMatch =
            type === "match.new" &&
            Boolean(
              data.liker_incognito ??
                data.likerIncognito ??
                data.other_incognito ??
                data.otherIncognito ??
                data.match_incognito ??
                data.matchIncognito ??
                false
            );
          if (isIncognitoMatch) {
            type = "like.received";
          }
          let title = notificationText.defaultTitle;
          let body = data.preview ?? data.body ?? notificationText.defaultBody;
          if (type === "match.new") {
            title = notificationText.matchTitle;
            body = notificationText.matchBody;
          } else if (type === "like.received") {
            return;
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
              ...(isIncognitoMatch ? { liker_incognito: true } : null),
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
              <View style={{ flex: 1, backgroundColor: "#0b1f16" }}>
                <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)} onStateChange={handleNavStateChange}>
                  <StatusBar style="light" />
                  <AppNavigator isAuthenticated={Boolean(session)} />
                </NavigationContainer>
                <PwaInstallBanner />
              </View>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </LocalizationProvider>
  );
};

export default App;
