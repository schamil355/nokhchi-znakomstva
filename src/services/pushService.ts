import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useAuthStore } from "../state/authStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export const registerPushNotifications = async () => {
  if (!Device.isDevice) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push permission denied");
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.manifest2?.extra?.eas?.projectId ?? Constants.manifest?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(
    projectId
      ? {
          projectId
        }
      : undefined
  );
  if (!token.data) {
    return;
  }

  const auth = useAuthStore.getState();
  if (!auth.session) {
    return;
  }

  const supabase = getSupabaseClient();
  const platform = Platform.OS;
  if (platform !== "ios" && platform !== "android") {
    console.warn(`Push registration skipped for unsupported platform: ${platform}`);
    return;
  }

  const { error } = await supabase.from("devices").upsert(
    {
      user_id: auth.session.user.id,
      token: token.data,
      platform,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "user_id,token"
    }
  );

  if (error) {
    const suffix = token.data ? token.data.slice(-6) : "unknown";
    console.warn(`Failed to register push token (...${suffix})`, error.message ?? error);
  }
};
