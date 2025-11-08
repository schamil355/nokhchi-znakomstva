import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { useEffect } from "react";
import { getSupabase } from "./supabase";
import { useSessionStore } from "../store/sessionStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type NotifyPayload =
  | {
      type: "match";
      matchId: string;
      receiverId: string;
      actorId: string;
    }
  | {
      type: "message";
      matchId: string;
      receiverId: string;
      actorId: string;
      preview: string;
    };

export const invokeNotify = async (payload: NotifyPayload) => {
  const supabase = getSupabase();
  const { error } = await supabase.functions.invoke("notify", {
    body: payload,
  });
  if (error) {
    console.warn("Failed to invoke notify function", error);
  }
};

const registerDeviceToken = async (userId: string, token: string) => {
  const supabase = getSupabase();
  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
    },
    { onConflict: "token" },
  );
  if (error) {
    console.warn("Failed to store device token", error);
  }
};

const getProjectId = () => {
  const config =
    Constants.expoConfig?.extra?.eas ??
    Constants.manifest2?.extra?.eas ??
    Constants.manifest?.extra?.eas;
  return config?.projectId;
};

const requestPushPermissions = async () => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
};

const obtainExpoPushToken = async () => {
  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId
      ? {
          projectId,
        }
      : undefined,
  );
  return tokenResponse.data;
};

export const usePushNotifications = () => {
  const session = useSessionStore((state) => state.session);

  useEffect(() => {
    if (!session?.user.id) {
      return undefined;
    }

    const setup = async () => {
      const granted = await requestPushPermissions();
      if (!granted) {
        console.warn("Push permission not granted");
        return;
      }
      const token = await obtainExpoPushToken();
      await registerDeviceToken(session.user.id, token);
    };
    setup().catch((error) =>
      console.warn("Failed to register push notifications", error),
    );

    const messageSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received", notification);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("Notification response", response);
      },
    );

    return () => {
      messageSub?.remove();
      responseSub?.remove();
    };
  }, [session?.user.id]);
};
